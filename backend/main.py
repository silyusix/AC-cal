from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from collections import Counter
import io
import base64

# Import numerical and symbolic libraries
import numpy as np
import control as ct
import sympy as sp # pyright: ignore[reportMissingModuleSource]
from sympy import Poly # type: ignore
import matplotlib.pyplot as plt
import uvicorn
import logging # <-- 新增这一行
import threading
import time
import webbrowser # 新增这一行
import os # 新增这一行
import sys # 新增这一行
from fastapi.staticfiles import StaticFiles # 新增这一行
# Determine the base path for static files
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Running in a PyInstaller bundle
    bundle_dir = sys._MEIPASS
    print(f"--- BUNDLE DIR: {bundle_dir} ---")
    try:
        print(f"--- BUNDLE CONTENTS: {os.listdir(bundle_dir)} ---")
    except Exception as e:
        print(f"--- ERROR LISTING BUNDLE CONTENTS: {e} ---")
    frontend_dist_path = os.path.join(bundle_dir, "dist")
    print(f"--- FRONTEND PATH: {frontend_dist_path} ---")
    print(f"--- FRONTEND EXISTS: {os.path.exists(frontend_dist_path)} ---")
else:
    # Running in a normal Python environment
    bundle_dir = os.path.dirname(os.path.abspath(__file__))
    # Path to the frontend dist folder when not frozen
    frontend_dist_path = os.path.join(bundle_dir, "..", "frontend", "dist")
    print(f"--- RUNNING IN DEV MODE ---")
    print(f"--- FRONTEND PATH: {frontend_dist_path} ---")

app = FastAPI()



    
# CORS Middleware Configuration
origins = ["*"]  # Allow all origins for debugging

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Data Models ---
class TransferFunctionInput(BaseModel):
    numerator: List[float]
    denominator: List[float]

class TimeDomainMetricsInput(BaseModel):
    rise_time: Optional[float] = None
    peak_time: Optional[float] = None
    max_overshoot: Optional[float] = None  # As percentage, e.g., 5 for 5%
    settling_time: Optional[float] = None

class SymbolicStabilityInput(BaseModel):
    denominator_coeffs: List[str]  # Coefficients can be strings like '1', '10', 'x'

class ComplexNumber(BaseModel):
    real: float
    imag: float

class RootLocusInput(BaseModel):
    zeros: List[ComplexNumber]
    poles: List[ComplexNumber]
    gain: Optional[float] = 1.0

class InverseAnalysisResult(BaseModel):
    damping_ratio: Optional[float]
    natural_frequency: Optional[float]
    message: str = ""
    # Note: Inverse analysis calculations are based on second-order system assumptions.

# --- Helper Functions ---
def _format_pole(p: complex) -> str:
    """Helper to format a complex pole into a readable string."""
    real_part = p.real
    imag_part = p.imag
    if np.isclose(imag_part, 0):
        if np.isclose(real_part, 0):
            return "0"
        return f'{real_part:.0f}' if np.isclose(real_part, round(real_part)) else f'{real_part:.2f}'
    else:
        imag_str = f'{"-" if imag_part < 0 else "+"}{abs(imag_part):.2f}j'
        if np.isclose(real_part, 0):
            return f'{imag_part:.2f}j'
        return f'{real_part:.2f} {imag_str}'

def _calculate_bode_asymptotes(sys: ct.TransferFunction, omega_range: np.ndarray, input_gain: float):
    """
    Calculates the Bode magnitude plot asymptotes for a given transfer function.

    Args:
        sys: A control.TransferFunction object.
        omega_range: A numpy array of frequencies for which to calculate the asymptotes.
        input_gain: The overall gain K from the user input (rl_input.gain).

    Returns:
        A tuple (asymptote_omega, asymptote_magnitude_db)
    """
    asymptote_omega = []
    asymptote_magnitude_db = []

    # Extract poles and zeros
    poles = sys.poles()
    zeros = sys.zeros()

    # Count poles and zeros at the origin
    poles_at_origin = sum(1 for p in poles if np.isclose(p, 0))
    zeros_at_origin = sum(1 for z in zeros if np.isclose(z, 0))

    # Filter out origin poles/zeros for corner frequency calculation
    non_origin_poles = [p for p in poles if not np.isclose(p, 0)]
    non_origin_zeros = [z for z in zeros if not np.isclose(z, 0)]

    # Identify corner frequencies and their types
    corner_frequencies_info = []
    for p in non_origin_poles:
        corner_frequencies_info.append((abs(p), 'pole', 1)) # (frequency, type, multiplicity)
    for z in non_origin_zeros:
        corner_frequencies_info.append((abs(z), 'zero', 1))

    # Sort corner frequencies
    corner_frequencies_info.sort(key=lambda x: x[0])

    # Determine the "K" gain for the Bode plot
    # This K is such that G(s) approx K / s^(poles_at_origin - zeros_at_origin) at low frequencies
    # This K is derived from the constant terms of the numerator and denominator after
    # factoring out all poles/zeros at the origin.
    
    num_coeffs = sys.num[0][0]
    den_coeffs = sys.den[0][0]

    min_num_power = 0
    for i, c in enumerate(reversed(num_coeffs)):
        if not np.isclose(c, 0):
            min_num_power = i
            break
    
    min_den_power = 0
    for i, c in enumerate(reversed(den_coeffs)):
        if not np.isclose(c, 0):
            min_den_power = i
            break

    effective_num_const = num_coeffs[len(num_coeffs) - 1 - min_num_power]
    effective_den_const = den_coeffs[len(den_coeffs) - 1 - min_den_power]

    if np.isclose(effective_den_const, 0):
        if not np.isclose(effective_num_const, 0):
            K_bode_low_freq = np.inf
        else:
            K_bode_low_freq = 0
    else:
        K_bode_low_freq = effective_num_const / effective_den_const
    

    # Initial slope based on poles/zeros at origin
    initial_slope_db_per_decade = -20 * (poles_at_origin - zeros_at_origin)
   
    
    # Calculate the magnitude at omega = 1 based on K_bode_low_freq
    # This is the reference point for the asymptote.
    if np.isclose(K_bode_low_freq, 0):
        magnitude_at_one_db = -np.inf
    elif np.isinf(K_bode_low_freq):
        magnitude_at_one_db = np.inf
    else:
        magnitude_at_one_db = 20 * np.log10(abs(K_bode_low_freq))
    

    # Calculate the magnitude at the start of omega_range
    omega_start = omega_range[0]
    mag_at_omega_start = magnitude_at_one_db + initial_slope_db_per_decade * np.log10(omega_start)
    
    
    asymptote_omega.append(omega_start)
    asymptote_magnitude_db.append(mag_at_omega_start)

    current_slope = initial_slope_db_per_decade

    # Iterate through corner frequencies
    for wc, type, multiplicity in corner_frequencies_info:
        # Ensure wc is within the omega_range
        if wc < omega_range[0] or wc > omega_range[-1]:
            continue

        # Calculate magnitude at the corner frequency using the current slope
        mag_at_wc = asymptote_magnitude_db[-1] + current_slope * np.log10(wc / asymptote_omega[-1])
        
        asymptote_omega.append(wc)
        asymptote_magnitude_db.append(mag_at_wc)

        # Update slope
        if type == 'pole':
            current_slope -= 20 * multiplicity
        elif type == 'zero':
            current_slope += 20 * multiplicity
        
        # Add a point just after the corner frequency with the new slope
        asymptote_omega.append(wc)
        asymptote_magnitude_db.append(mag_at_wc)

    # Add the final point at the end of the omega_range
    omega_end = omega_range[-1]
    if omega_end > asymptote_omega[-1]:
        mag_at_omega_end = asymptote_magnitude_db[-1] + current_slope * np.log10(omega_end / asymptote_omega[-1])
        asymptote_omega.append(omega_end)
        asymptote_magnitude_db.append(mag_at_omega_end)
    
    # Ensure the lists are not empty
    if not asymptote_omega:
        return [], []

    return asymptote_omega, asymptote_magnitude_db

# --- API Endpoints ---

# --- 1. 正向分析 (Transfer Function Analysis) - 功能完善，无需修改 ---
@app.post("/analyze_tf")
async def analyze_transfer_function(tf_input: TransferFunctionInput):
    try:
        sys = ct.TransferFunction(tf_input.numerator, tf_input.denominator)
        info_2_percent = ct.step_info(sys, T=None, SettlingTimeThreshold=0.02)
        info_5_percent = ct.step_info(sys, T=None, SettlingTimeThreshold=0.05)
        metrics = {
            "rise_time": f'{info_2_percent["RiseTime"]:.3f}' if 'RiseTime' in info_2_percent else "N/A",
            "peak_time": f'{info_2_percent["PeakTime"]:.3f}' if 'PeakTime' in info_2_percent else "N/A",
            "max_overshoot": f'{info_2_percent["Overshoot"]:.3f}' if 'Overshoot' in info_2_percent else "N/A",
            "settling_time_2_percent": f'{info_2_percent["SettlingTime"]:.3f}' if 'SettlingTime' in info_2_percent else "N/A",
            "settling_time_5_percent": f'{info_5_percent["SettlingTime"]:.3f}' if 'SettlingTime' in info_5_percent else "N/A",
        }

        poles = sys.poles()
        has_rhp_poles = any(p.real > 0 for p in poles)
        imag_axis_poles = [p for p in poles if np.isclose(p.real, 0)]
        pole_counts = Counter(np.round(imag_axis_poles, decimals=5))
        has_repeated_imag_axis_poles = any(count > 1 for count in pole_counts.values())

        if has_rhp_poles or has_repeated_imag_axis_poles:
            stability_status = "Unstable"
        elif len(imag_axis_poles) > 0:
            stability_status = "Marginally Stable"
        else:
            stability_status = "Stable"

        return {
            "message": "Analysis successful",
            "input": tf_input.dict(),
            "metrics": metrics,
            "stability": {"status": stability_status, "poles": [_format_pole(p) for p in poles]}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- 2. 反向分析 (Inverse Analysis) - 功能完善，无需修改 ---
@app.post("/inverse_analyze_tf", response_model=InverseAnalysisResult)
async def inverse_analyze_transfer_function(metrics_input: TimeDomainMetricsInput):
    zeta = None
    omega_n = None
    message = ""
    if metrics_input.max_overshoot is not None and metrics_input.max_overshoot > 0:
        try:
            if metrics_input.max_overshoot >= 100:
                zeta = 1.0
            else:
                ln_mp = np.log(metrics_input.max_overshoot / 100.0)
                if ln_mp**2 + np.pi**2 > 0:
                    zeta = np.sqrt(ln_mp**2 / (np.pi**2 + ln_mp**2))
                    if zeta > 1:
                        zeta = 1.0
                else:
                    message += "Invalid overshoot value for underdamped system. "
        except Exception as e:
            message += f"Error calculating zeta from overshoot: {e}. "
    if metrics_input.peak_time is not None and zeta is not None and zeta < 1:
        try:
            if metrics_input.peak_time > 0 and (1 - zeta**2) > 0:
                omega_n = np.pi / (metrics_input.peak_time * np.sqrt(1 - zeta**2))
        except Exception as e:
            message += f"Error calculating omega_n from peak time: {e}. "
    elif metrics_input.settling_time is not None and zeta is not None and zeta > 0:
        try:
            if metrics_input.settling_time > 0:
                omega_n = 4 / (metrics_input.settling_time * zeta)
        except Exception as e:
            message += f"Error calculating omega_n from settling time: {e}. "
    if zeta is None or omega_n is None:
        message += "Insufficient or conflicting metrics provided. "
    return InverseAnalysisResult(damping_ratio=zeta, natural_frequency=omega_n, message=message.strip())

# --- 3. 劳斯稳定性分析 (Routh Stability Analysis) - 功能完善，无需修改 ---
@app.post("/analyze_stability_range")
async def analyze_stability_range(symbolic_input: SymbolicStabilityInput):
    try:
        x = sp.symbols('x')
        coeffs = [sp.sympify(c) for c in symbolic_input.denominator_coeffs]

        if not any(c.has(x) for c in coeffs):
            return {"message": "This mode is for symbolic analysis. Please include 'x' in the coefficients.", "stability_range": "N/A"}

        n = len(coeffs)
        if n < 2:
            return {"message": "Characteristic equation must have at least 2 coefficients.", "stability_range": "N/A"}

        routh_array = [[sp.S(0) for _ in range((n + 1) // 2)] for _ in range(n)]
        for i, c in enumerate(coeffs[::2]):
            routh_array[0][i] = c
        for i, c in enumerate(coeffs[1::2]):
            routh_array[1][i] = c

        for i in range(2, n):
            if all(val == 0 for val in routh_array[i-1]):
                return {"message": "Routh array has an all-zero row. This indicates the presence of roots symmetric about the origin (e.g., purely imaginary or real and equal/opposite). Further analysis using an auxiliary polynomial is required to determine stability, which is not fully automated in this tool. Manual analysis or a more advanced tool may be needed.", "stability_range": "Not fully determined (requires auxiliary polynomial analysis)"}
            if routh_array[i-1][0] == 0:
                epsilon = sp.Symbol('epsilon', positive=True)
                routh_array[i-1][0] = epsilon

            for j in range((n + 1) // 2 - 1):
                b1, b2 = routh_array[i-2][j], routh_array[i-2][j+1] if j+1 < len(routh_array[i-2]) else 0
                b3, b4 = routh_array[i-1][j], routh_array[i-1][j+1] if j+1 < len(routh_array[i-1]) else 0
                try:
                    routh_array[i][j] = sp.simplify((b3 * b2 - b1 * b4) / b3)
                except ZeroDivisionError:
                    routh_array[i][j] = sp.nan

        first_column = [routh_array[i][0] for i in range(n)]
        conditions = []
        for c in first_column:
            if c.has(sp.Symbol('epsilon')):
                c = c.subs(sp.Symbol('epsilon'), 0)
            if not c.has(sp.nan) and not c.has(sp.oo) and not c.has(sp.zoo) and not c.has(sp.nan):
                conditions.append(c > 0)

        solution = sp.solve(conditions, x, domain=sp.S.Reals)

        if not solution:
            return {"message": "No stable region found for x. System is unstable for all x.", "stability_range": "No stable region"}

        formatted_solution = str(solution).replace('oo', '∞').replace('(', '').replace(')', '').replace('&', ' and ')
        return {"message": "Symbolic stability analysis successful", "stability_range": formatted_solution}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

# --- 4. 根轨迹分析 (Root Locus Analysis) - 功能完善，无需修改 ---
@app.post("/plot_root_locus")
async def plot_root_locus(rl_input: RootLocusInput):
    try:
        s = sp.symbols('s')
        zeros_complex = [complex(z.real, z.imag) for z in rl_input.zeros]
        poles_complex = [complex(p.real, p.imag) for p in rl_input.poles]

        zeros = np.array(zeros_complex, dtype=complex)
        poles = np.array(poles_complex, dtype=complex)

        if poles.size == 0:
            raise ValueError("Root locus requires at least one pole.")

        num_poly = np.poly(zeros) if zeros.size > 0 else [1]
        den_poly = np.poly(poles)

        sys = ct.TransferFunction(num_poly, den_poly)
        kvect = np.logspace(-2, 5, 15000)
        rlist, klist = ct.root_locus(sys, kvect=kvect, plot=False)

        for i in range(rlist.shape[1]):
            for j in range(rlist.shape[0]):
                if abs(rlist[j, i].imag) < 1e-3:
                    rlist[j, i] = rlist[j, i].real + 0j

        branches = []
        for i in range(rlist.shape[1]):
            branch = rlist[:, i]
            branches.append({
                "x": branch.real.tolist(),
                "y": branch.imag.tolist(),
                "k": klist.tolist()
            })

        asymptote_data = None
        n = len(poles)
        m = len(zeros)
        if n > m:
            num_asymptotes = n - m
            sum_poles = np.sum(poles)
            sum_zeros = np.sum(zeros) if m > 0 else 0
            centroid = (sum_poles - sum_zeros) / num_asymptotes
            angles = [(2 * q + 1) * 180 / num_asymptotes for q in range(num_asymptotes)]
            asymptote_data = {"centroid": float(centroid.real), "angles": angles}

        breakaway_points = []
        num_poly_coeffs = np.poly(zeros) if zeros.size > 0 else [1.0]
        den_poly_coeffs = np.poly(poles)
        num_deriv_coeffs = np.polyder(num_poly_coeffs)
        den_deriv_coeffs = np.polyder(den_poly_coeffs)
        eq_coeffs = np.polysub(np.polymul(den_poly_coeffs, num_deriv_coeffs), np.polymul(num_poly_coeffs, den_deriv_coeffs))
        potential_points = np.roots(eq_coeffs)

        real_poles_zeros_values = []
        for p in poles:
            if abs(p.imag) < 1e-5:
                real_poles_zeros_values.append(p.real)
        for z in zeros:
            if abs(z.imag) < 1e-5:
                real_poles_zeros_values.append(z.real)
        real_poles_zeros_values = np.sort(np.array(real_poles_zeros_values))

        real_axis_locus_segments = []
        if len(real_poles_zeros_values) > 0:
            # Segments between points
            for i in range(len(real_poles_zeros_values) - 1):
                test_point = (real_poles_zeros_values[i] + real_poles_zeros_values[i+1]) / 2
                count_right = np.sum(real_poles_zeros_values > test_point)
                if count_right % 2 == 1:
                    real_axis_locus_segments.append((real_poles_zeros_values[i], real_poles_zeros_values[i+1]))
            # Segment to the right of the rightmost point
            test_point = real_poles_zeros_values[-1] + 1
            count_right = np.sum(real_poles_zeros_values > test_point)
            if count_right % 2 == 1:
                real_axis_locus_segments.append((real_poles_zeros_values[-1], np.inf))

        open_loop_sys = ct.TransferFunction(num_poly, den_poly)
        for pt in potential_points:
            k_val = -ct.evalfr(ct.TransferFunction(den_poly_coeffs, num_poly_coeffs), pt)
            if abs(k_val.imag) < 1e-5 and k_val.real > 0:
                try:
                    gh_at_pt = ct.evalfr(open_loop_sys, pt)
                    phase_gh = np.angle(gh_at_pt, deg=True)
                    is_phase_condition_met = any(abs(phase_gh - ((2 * q + 1) * 180)) % 360 < 5 for q in range(-2, 3))
                    if is_phase_condition_met:
                        if abs(pt.imag) < 1e-5:
                            if any(start <= pt.real <= end for start, end in real_axis_locus_segments):
                                breakaway_points.append({"x": pt.real, "y": pt.imag})
                        else:
                            breakaway_points.append({"x": pt.real, "y": pt.imag})
                except Exception:
                    pass

        unique_breakaway_points_map = {}
        for bp in breakaway_points:
            key = (round(bp["x"], 5), round(bp["y"], 5))
            if key not in unique_breakaway_points_map:
                unique_breakaway_points_map[key] = bp
        breakaway_points = sorted(list(unique_breakaway_points_map.values()), key=lambda bp: (bp["x"], bp["y"]))

        imag_axis_crossings = []
        s_sym, K_sym, omega_sym = sp.symbols('s K omega', real=True)
        num_poly_coeffs_sym = Poly(num_poly, s_sym)
        den_poly_coeffs_sym = Poly(den_poly, s_sym)
        char_eq_sym = den_poly_coeffs_sym.as_expr() + K_sym * num_poly_coeffs_sym.as_expr()
        char_eq_jw = char_eq_sym.subs(s_sym, sp.I * omega_sym)
        real_part = sp.re(char_eq_jw)
        imag_part = sp.im(char_eq_jw)
        solutions = sp.solve([real_part, imag_part], (omega_sym, K_sym), dict=True)
        for sol in solutions:
            omega_val = sol.get(omega_sym)
            K_val = sol.get(K_sym)
            if omega_val is not None and K_val is not None and hasattr(omega_val, 'is_real') and hasattr(K_val, 'is_real'):
                if omega_val.is_real and omega_val > 0 and K_val.is_real and K_val > 0:
                    imag_axis_crossings.append({"x": 0, "y": float(omega_val), "k": float(K_val)})
                    imag_axis_crossings.append({"x": 0, "y": -float(omega_val), "k": float(K_val)})

        unique_crossings_map = {}
        for crossing in imag_axis_crossings:
            key = (round(crossing["y"], 5), round(crossing["k"], 5))
            if key not in unique_crossings_map:
                unique_crossings_map[key] = crossing
        imag_axis_crossings = sorted(list(unique_crossings_map.values()), key=lambda c: c["y"])

        return {
            "message": "Root locus data calculated successfully",
            "branches": branches,
            "zeros": [{"x": z.real, "y": z.imag} for z in zeros],
            "poles": [{"x": p.real, "y": p.imag} for p in poles],
            "asymptotes": asymptote_data,
            "breakaway_points": breakaway_points,
            "imag_axis_crossings": imag_axis_crossings
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

# --- 5. 频域分析 (Frequency Domain Analysis) ---
@app.post("/analyze_frequency_domain")
async def analyze_frequency_domain(rl_input: RootLocusInput):
    try:
        zeros_complex = [complex(z.real, z.imag) for z in rl_input.zeros]
        poles_complex = [complex(p.real, p.imag) for p in rl_input.poles]

        zeros = np.array(zeros_complex, dtype=complex)
        poles = np.array(poles_complex, dtype=complex)

        if poles.size == 0:
            raise ValueError("Transfer function requires at least one pole.")

        num_poly = np.poly(zeros) if zeros.size > 0 else [1]
        den_poly = np.poly(poles)

        sys_base = ct.TransferFunction(num_poly, den_poly)
        sys_with_gain = rl_input.gain * sys_base

        omega = np.logspace(-2, 2, 1000)
        
        # Manually calculate frequency response to have more control
        s_jw = 1j * omega
        response = ct.evalfr(sys_with_gain, s_jw)
        
        mag = np.abs(response)
        phase = np.angle(response) # Phase in radians

        mag_non_negative = np.maximum(mag, 1e-10)
        mag_db_raw = 20 * np.log10(mag_non_negative)
        mag_db = [None if np.isinf(x) or np.isnan(x) else x for x in mag_db_raw]
        
        # Unwrap phase to handle jumps
        phase_unwrapped = np.unwrap(phase)
        phase_deg = np.rad2deg(phase_unwrapped).tolist()

        corner_frequencies = []
        for p in sys_with_gain.poles():
            if p.real != 0 or p.imag != 0:
                corner_frequencies.append(abs(p))
        for z in sys_with_gain.zeros():
            if z.real != 0 or z.imag != 0:
                corner_frequencies.append(abs(z))
        corner_frequencies = sorted(list(set(corner_frequencies)))

        # Calculate Bode asymptotes
        asymptote_omega, asymptote_magnitude_db = _calculate_bode_asymptotes(sys_with_gain, omega, rl_input.gain)

        nyquist_data = ct.nyquist_response(sys_with_gain, omega=omega)
        complex_response = nyquist_data.response
        print(f"DEBUG: complex_response before filtering: {complex_response}")

        # Filter out inf and NaN values from the response
        valid_indices = np.isfinite(complex_response)
        filtered_complex_response = complex_response[valid_indices]
        filtered_omega = omega[valid_indices]
        print(f"DEBUG: complex_response after filtering: {filtered_complex_response}")
        nyquist_real = np.real(complex_response).tolist()
        nyquist_imag = np.imag(complex_response).tolist()
        nyquist_freq = omega.tolist()
        nyquist_asymptote_info = {"type": "none", "value": None}
        poles_at_origin_count = sum(1 for p in poles if np.isclose(p.real, 0) and np.isclose(p.imag, 0))

        if poles_at_origin_count > 0:
            s_sym = sp.symbols('s')
            omega_sym = sp.symbols('omega', real=True)
            num_poly_sym = sp.Poly(num_poly, s_sym).as_expr()
            den_poly_sym = sp.Poly(den_poly, s_sym).as_expr()
            gh_sym = rl_input.gain * num_poly_sym / den_poly_sym

            if poles_at_origin_count == 1: # Type 1 System
                print("\nAnalyzing for Type 1 (1 pole at origin) with user-defined asymptote calculation...")
                try:
                    # Calculate Re[G(jω)] as ω -> 0
                    gh_jw_sym = gh_sym.subs(s_sym, 1j * omega_sym)
                    real_part_gh_jw = sp.re(gh_jw_sym)
                    limit_val = sp.limit(real_part_gh_jw, omega_sym, 0)

                   

                    if limit_val.is_real and not limit_val.has(sp.oo) and not limit_val.has(sp.nan):
                        nyquist_asymptote_info = {"type": "vertical_line", "value": float(limit_val.evalf())}
                    else:
                        print("Limit is not a real number or is infinite, no real asymptote.")
                except Exception as e:
                    print(f"Error calculating limit for Type 1: {e}")
            elif poles_at_origin_count >= 2: # Type 2 or Higher System
                print(f"\nAnalyzing for Type {poles_at_origin_count} ({poles_at_origin_count} poles at origin)...")
                try:
                    power = poles_at_origin_count - 1
                    limit_expr = s_sym**power * gh_sym
                    limit_val = sp.limit(limit_expr, s_sym, 0)

                    
                    
                    if not (limit_val.has(sp.oo) or limit_val.has(sp.nan)):
                        asymptote_complex = limit_val.evalf()
                        nyquist_asymptote_info = {"type": "point", "value": {"x": float(asymptote_complex.real), "y": float(asymptote_complex.imag)}}
                    else:
                         print("Limit is infinite or NaN, no finite point asymptote.")
                except Exception as e:
                    print(f"Error calculating limit for Type {poles_at_origin_count}: {e}")

        gm, pm, wg, wp = np.nan, np.nan, np.nan, np.nan
        try:
            gm, pm, wg, wp = ct.margin(sys_with_gain)
        except Exception:
            pass

        def safe_float(x):
            return None if np.isinf(x) or np.isnan(x) else float(x)

        stability_margins = {
            "gain_margin_db": safe_float(20 * np.log10(gm)) if gm > 0 else None,
            "phase_margin_deg": safe_float(np.rad2deg(pm)),
            "gain_crossover_freq_rad_s": safe_float(wg),
            "phase_crossover_freq_rad_s": safe_float(wp)
        }

        dc_gain_simple = num_poly[-1] / den_poly[-1] if den_poly[-1] != 0 else np.inf

        

        return {
            "message": "Frequency domain analysis successful",
            "bode": {
                "omega": omega.tolist(),
                "magnitude_db": mag_db,
                "phase_deg": phase_deg,
                "corner_frequencies": corner_frequencies,
                "asymptote_omega": asymptote_omega, # Add asymptote data
                "asymptote_magnitude_db": asymptote_magnitude_db # Add asymptote data
            },
            "nyquist": {
                "real": nyquist_real,
                "imag": nyquist_imag,
                "frequency": nyquist_freq,
                "asymptote": nyquist_asymptote_info
            },
            "stability_margins": stability_margins,
            "dc_gain": safe_float(dc_gain_simple)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================
# 6. 相轨迹分析 (Phase Portrait Analysis)
# ============================================================
from phase_portrait import router as phase_portrait_router
app.include_router(phase_portrait_router, prefix="/analysis", tags=["Phase Portrait Analysis"])

# ============================================================
# 7. 频域校正设计 (Frequency Domain Compensation Design)
# ============================================================
from compensation import router as compensation_router
app.include_router(compensation_router, prefix="/compensation", tags=["Compensator Design"])


# ============================================================
# 从这里开始是新添加的代码，用于解决打包和启动问题
# ============================================================


@app.get("/health")
async def health_check():
    """A simple health check endpoint."""
    return {"status": "ok"}
app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")


if __name__ == "__main__":
    print("Starting main block...")
    # 【重要】为了解决打包后的 uvicorn 日志冲突错误，提前禁用它的日志
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    print("Logging configured.")

    def open_browser():
        # 给服务器足够的时间启动
        print("Browser thread started, waiting for server...")
        time.sleep(2.5)
        try:
            # 尝试用默认浏览器打开地址
            print("Opening browser...")
            webbrowser.open('http://127.0.0.1:8000') # Disabled for development to avoid confusion
            print("Browser open command issued.")
        except Exception as e:
            # 如果打开失败（例如在无GUI环境），静默忽略，不影响服务器运行
            print(f"Failed to open browser: {e}")
            pass
            
    # 检查是否是通过 PyInstaller 打包的可执行文件
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        # 如果是打包环境，则以守护线程启动浏览器
        print("Running in PyInstaller bundle, starting browser thread...")
        threading.Thread(target=open_browser, daemon=True).start()
    else:
        # 如果是开发环境（直接运行.py文件），同样以守护线程启动浏览器
        print("Running in development, starting browser thread...")
        threading.Thread(target=open_browser, daemon=True).start()

    # 【关键修改】启动服务器，并明确指定不使用 uvicorn 的默认日志配置
    # log_config=None 是解决打包问题的关键
    print("Starting uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
    print("Uvicorn server stopped.")

# ============================================================
# 新增代码结束
# ============================================================
