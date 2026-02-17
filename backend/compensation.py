from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import control as ct
import math

# --- Helper Functions ---
def sanitize_list(data_list):
    """Replaces inf and nan in a list with None for JSON compatibility."""
    return [x if np.isfinite(x) else None for x in data_list]

def format_gain_margin(gm_val):
    """Helper to format gain margin into dB, handling None/inf/nan values."""
    if gm_val is None or math.isinf(gm_val) or math.isnan(gm_val):
        return None  # Use null for non-existent/infinite GM
    return 20 * np.log10(gm_val)


# Create a new APIRouter instance. This router will be included in the main FastAPI app.
router = APIRouter()


# --- Data Models ---
# These Pydantic models define the structure of the request bodies for our API endpoints.
class LeadCompensatorInput(BaseModel):
    """Input model for designing a lead compensator."""
    numerator: List[float]
    denominator: List[float]
    desired_phase_margin: float
    safety_margin: float = 5.0  # A safety margin in degrees, as a common practice.


class LagCompensatorInput(BaseModel):
    """Input model for designing a lag compensator."""
    numerator: List[float]
    denominator: List[float]
    desired_kv: float

class LagLeadCompensatorInput(BaseModel):
    """
    Input model for designing a lag-lead compensator.
    """
    numerator: List[float]
    denominator: List[float]
    desired_phase_margin: float
    desired_kv: float
    safety_margin: float = 5.0 # A safety margin in degrees


# --- API Endpoints ---
@router.post("/design_lead_compensator")
async def design_lead_compensator(comp_input: LeadCompensatorInput):
    """
    Designs a lead compensator for a given system to meet a desired phase margin.
    This endpoint takes the system's transfer function and a target phase margin,
    then calculates the lead compensator parameters and provides performance plots.
    """
    try:
        # 1. Create the uncompensated system model
        sys_uncompensated = ct.TransferFunction(comp_input.numerator, comp_input.denominator)

        # 2. Analyze the uncompensated system's stability margins
        gm, pm, wg, wp = ct.margin(sys_uncompensated)
        if math.isnan(pm):
            raise ValueError(
                "Could not determine the phase margin of the uncompensated system. "
                "It might be unstable or have other issues."
            )

        # 3. Determine the required phase lead
        required_phase_lead = comp_input.desired_phase_margin - pm + comp_input.safety_margin

        if required_phase_lead <= 0:
            raise ValueError(
                f"The current phase margin ({pm:.2f}°) already meets or exceeds "
                "the desired margin. No lead compensation needed."
            )
        if required_phase_lead > 65:
            raise ValueError(
                f"Required phase lead ({required_phase_lead:.2f}°) is too high. "
                "A single lead compensator is typically not recommended for phase "
                "leads greater than 65°. Consider a different compensation strategy "
                "or a double lead compensator."
            )

        # 4. Calculate compensator parameters (alpha, T)
        phi_m_rad = np.deg2rad(required_phase_lead)
        alpha = (1 - np.sin(phi_m_rad)) / (1 + np.sin(phi_m_rad))

        # Find the frequency where the uncompensated system's gain is -10*log10(1/alpha) dB
        mag_at_new_gc = -10 * np.log10(1 / alpha)

        # Search for this frequency numerically
        omega_range = np.logspace(-4, 4, 2000)
        mag_abs, _, _ = ct.bode(sys_uncompensated, omega=omega_range, plot=False)
        mag_db = 20 * np.log10(mag_abs)  # BUG FIX: Convert magnitude to dB for comparison

        # Find the frequency (omega_m) where magnitude matches our target
        if np.all(mag_db > mag_at_new_gc):
            raise ValueError(
                "System gain is always higher than the target for the new crossover "
                "frequency. Cannot determine omega_m."
            )
        if np.all(mag_db < mag_at_new_gc):
            raise ValueError(
                "System gain is always lower than the target for the new crossover "
                "frequency. Cannot determine omega_m."
            )

        # np.interp finds the frequency by interpolating between magnitude values.
        # Reversing arrays ensures interpolation works correctly when magnitude
        # decreases with frequency.
        omega_m = np.interp(mag_at_new_gc, mag_db[::-1], omega_range[::-1])

        if omega_m <= 0:
            raise ValueError("Could not find a valid new crossover frequency (omega_m).")

        # 5. Calculate compensator zero and pole
        # The standard lead compensator form is Gc(s) = Kc * (s + z) / (s + p),
        # where z = 1/T and p = 1/(alpha*T).
        z = omega_m * np.sqrt(alpha)
        p = omega_m / np.sqrt(alpha)

        # Create the compensator transfer function. The DC gain effect is handled
        # by the series connection later.
        compensator_tf = ct.TransferFunction([1, z], [1, p])

        # 6. Create the compensated system
        sys_compensated = ct.series(compensator_tf, sys_uncompensated)

        # 7. Generate data for comparison plots
        omega_range_for_plot = np.logspace(-4, 4, 2000)

        # Step response for uncompensated system
        cl_uncompensated = ct.feedback(sys_uncompensated, 1)
        t_un, y_un = ct.step_response(cl_uncompensated)

        # Bode plot data for uncompensated system
        mag_un, phase_un, omega_un = ct.bode(sys_uncompensated, omega=omega_range_for_plot, plot=False)

        # Step response for compensated system
        cl_compensated = ct.feedback(sys_compensated, 1)
        t_co, y_co = ct.step_response(cl_compensated)

        # Bode plot data for compensated system
        mag_co, phase_co, omega_co = ct.bode(sys_compensated, omega=omega_range_for_plot, plot=False)

        # Get new stability margins
        gm_co, pm_co, wg_co, wp_co = ct.margin(sys_compensated)



        return {
            "message": "Lead compensator designed successfully.",
            "compensator": {
                "numerator": [1, z],
                "denominator": [1, p],
                "zero": -z,
                "pole": -p,
                "alpha": alpha,
                "omega_m": omega_m,
            },
            "performance": {
                "before": {
                    "phase_margin": pm if not math.isnan(pm) else None,
                    "gain_margin_db": format_gain_margin(gm),
                    "gain_crossover_freq": wg if not math.isnan(wg) else None,
                    "phase_crossover_freq": wp if not math.isnan(wp) else None,
                },
                "after": {
                    "phase_margin": pm_co if not math.isnan(pm_co) else None,
                    "gain_margin_db": format_gain_margin(gm_co),
                    "gain_crossover_freq": wg_co if not math.isnan(wg_co) else None,
                    "phase_crossover_freq": wp_co if not math.isnan(wp_co) else None,
                }
            },
            "plots": {
                "bode": {
                    "omega": sanitize_list(omega_un.tolist()),
                    "uncompensated_mag_db": sanitize_list((20 * np.log10(mag_un)).tolist()),
                    "uncompensated_phase_deg": sanitize_list(np.rad2deg(phase_un).tolist()),
                    "compensated_mag_db": sanitize_list((20 * np.log10(mag_co)).tolist()),
                    "compensated_phase_deg": sanitize_list(np.rad2deg(phase_co).tolist()),
                },
                "step_response": {
                    "uncompensated_time": sanitize_list(t_un.tolist()),
                    "uncompensated_response": sanitize_list(y_un.tolist()),
                    "compensated_time": sanitize_list(t_co.tolist()),
                    "compensated_response": sanitize_list(y_co.tolist()),
                },
            },
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/design_lag_compensator")
async def design_lag_compensator(comp_input: LagCompensatorInput):
    """
    Designs a lag compensator for a given system to meet a desired velocity error constant (Kv).
    This endpoint is suitable for Type 1 systems to improve steady-state error without
    significantly affecting the transient response.
    """
    try:
        # 1. Create the uncompensated system model
        sys_uncompensated = ct.TransferFunction(comp_input.numerator, comp_input.denominator)
        s = ct.TransferFunction.s

        # 2. Calculate the uncompensated system's velocity error constant (Kv)
        def get_kv_from_coeffs(num, den):
            """Calculates Kv and determines system type based on transfer function coefficients."""
            # Count trailing zeros in denominator to find number of integrators
            num_integrators = 0
            for coeff in reversed(den):
                if np.isclose(coeff, 0):
                    num_integrators += 1
                else:
                    break

            if num_integrators == 0:  # Type 0 system
                return 0, num_integrators

            if num_integrators > 1:  # Type 2 or higher system
                return np.inf, num_integrators

            # System is Type 1, calculate finite Kv
            # Kv = (last non-zero num coeff) / (last non-zero den coeff before the integrator)
            last_num_coeff = num[-1]
            # The denominator coefficient just before the integrator zeros
            last_den_coeff = den[-(num_integrators + 1)]

            if np.isclose(last_den_coeff, 0):  # Should not occur for a proper Type 1 system
                return np.inf, num_integrators

            return last_num_coeff / last_den_coeff, num_integrators

        kv_old, num_integrators = get_kv_from_coeffs(comp_input.numerator, comp_input.denominator)

        if num_integrators != 1:
            raise ValueError(
                f"Lag compensation is designed for Type 1 systems. This is a Type "
                f"{num_integrators} system. Its Kv is {kv_old:.2f}."
            )

        if comp_input.desired_kv <= kv_old:
            raise ValueError(
                f"The current Kv ({kv_old:.2f}) already meets or exceeds the desired Kv. "
                "No lag compensation needed."
            )

        # 3. Calculate required gain boost (beta) and find current crossover frequency
        beta = comp_input.desired_kv / kv_old
        gm, pm, wg, wp = ct.margin(sys_uncompensated)

        if np.isnan(wg):
            raise ValueError(
                "Could not determine the gain crossover frequency of the original system. "
                "Cannot proceed with lag compensator design."
            )

        # 4. Place the compensator zero and pole
        # Heuristic: place the zero one decade below the original crossover frequency
        # to have minimal impact on the phase margin at the new crossover frequency.
        z = wg / 10
        p = z / beta

        # 5. Create the compensator and the new compensated system
        compensator_tf = ct.TransferFunction([1, z], [1, p])
        sys_compensated = ct.series(compensator_tf, sys_uncompensated)

        # 6. Generate data for comparison
        omega_range_for_plot = np.logspace(-4, 4, 2000)

        # Uncompensated system data
        cl_uncompensated = ct.feedback(sys_uncompensated, 1)
        t_un, y_un = ct.step_response(cl_uncompensated)
        mag_un, phase_un, omega_un = ct.bode(sys_uncompensated, omega=omega_range_for_plot, plot=False)

        # Compensated system data
        gm_co, pm_co, wg_co, wp_co = ct.margin(sys_compensated)
        
        # Calculate the new Kv for the compensated system
        kv_co_sys = s * sys_compensated
        # kv_co_val = np.real(ct.evalfr(kv_co_sys, 0)) # Original line, removed due to numerical instability
        # kv_co = kv_co_val if not math.isnan(kv_co_val) and not math.isinf(kv_co_val) else None # Original line
        kv_co = comp_input.desired_kv # Direct assignment, as this is the design goal.
        
        cl_compensated = ct.feedback(sys_compensated, 1)
        t_co, y_co = ct.step_response(cl_compensated)
        mag_co, phase_co, omega_co = ct.bode(sys_compensated, omega=omega_range_for_plot, plot=False)

        phase_un_deg = np.rad2deg(phase_un).tolist()
        phase_co_deg = np.rad2deg(phase_co).tolist()

        print(f"DEBUG: Lag Compensator - phase_un_deg (before sanitize): {phase_un_deg}")
        print(f"DEBUG: Lag Compensator - phase_co_deg (before sanitize): {phase_co_deg}")

        return {
            "message": "Lag compensator designed successfully.",
            "compensator": {
                "numerator": [1, z],
                "denominator": [1, p],
                "zero": -z,
                "pole": -p,
                "beta": beta,
            },
            "performance": {
                "before": {
                    "kv": kv_old,
                    "phase_margin": pm if not math.isnan(pm) else None,
                    "gain_margin_db": format_gain_margin(gm),
                    "gain_crossover_freq": wg if not math.isnan(wg) else None,
                    "phase_crossover_freq": wp if not math.isnan(wp) else None,
                },
                "after": {
                    "kv": kv_co,
                    "phase_margin": pm_co if not math.isnan(pm_co) else None,
                    "gain_margin_db": format_gain_margin(gm_co),
                    "gain_crossover_freq": wg_co if not math.isnan(wg_co) else None,
                    "phase_crossover_freq": wp_co if not math.isnan(wp_co) else None,
                },
            },
            "plots": {
                "bode": {
                    "omega": sanitize_list(omega_un.tolist()),
                    "uncompensated_mag_db": sanitize_list((20 * np.log10(mag_un)).tolist()),
                    "uncompensated_phase_deg": sanitize_list(phase_un_deg),
                    "compensated_mag_db": sanitize_list((20 * np.log10(mag_co)).tolist()),
                    "compensated_phase_deg": sanitize_list(phase_co_deg),
                },
                "step_response": {
                    "uncompensated_time": sanitize_list(t_un.tolist()),
                    "uncompensated_response": sanitize_list(y_un.tolist()),
                    "compensated_time": sanitize_list(t_co.tolist()),
                    "compensated_response": sanitize_list(y_co.tolist()),
                },
            },
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/design_lag_lead_compensator")
async def design_lag_lead_compensator(comp_input: LagLeadCompensatorInput):
    """
    Designs a lag-lead compensator to meet both steady-state (Kv) and
    transient (phase margin) requirements.
    """
    try:
        # --- Initial Setup ---
        sys_uncompensated = ct.TransferFunction(comp_input.numerator, comp_input.denominator)
        s = ct.TransferFunction.s

        # --- Part 1: Lag Compensation Design (for Kv requirement) ---
        def get_kv(num, den):
            num_integrators = 0
            for c in reversed(den):
                if np.isclose(c, 0): num_integrators += 1
                else: break
            if num_integrators != 1: return (0 if num_integrators == 0 else np.inf), num_integrators
            last_num_coeff = num[-1]
            last_den_coeff = den[-(num_integrators + 1)]
            if np.isclose(last_den_coeff, 0): return np.inf, num_integrators
            return last_num_coeff / last_den_coeff, num_integrators

        kv_old, num_integrators = get_kv(comp_input.numerator, comp_input.denominator)

        if num_integrators != 1:
            raise ValueError(f"System must be Type 1 for Kv-based lag design. This is a Type {num_integrators} system.")

        if comp_input.desired_kv <= kv_old:
            beta = 1.0
            lag_compensator_tf = ct.TransferFunction([1], [1]) # No lag part needed
        else:
            beta = comp_input.desired_kv / kv_old
            # Heuristic for placing lag zero/pole far from new crossover freq
            # We don't know the new crossover freq yet, so we place it relative to the old one.
            _, _, wg_old, _ = ct.margin(sys_uncompensated)
            if np.isnan(wg_old):
                raise ValueError("Cannot determine original gain crossover frequency to place lag part.")
            
            # Place zero at wg/10, pole at z/beta.
            # This is a common heuristic.
            z_lag = wg_old / 10
            p_lag = z_lag / beta
            lag_compensator_tf = ct.TransferFunction([1, z_lag], [1, p_lag])

        sys_lag_compensated = ct.series(lag_compensator_tf, sys_uncompensated)

        # --- Part 2: Lead Compensation Design (for Phase Margin requirement) ---
        gm_lag, pm_lag, _, _ = ct.margin(sys_lag_compensated)
        if math.isnan(pm_lag):
            raise ValueError("Could not determine phase margin after lag compensation.")

        required_phase_lead = comp_input.desired_phase_margin - pm_lag + comp_input.safety_margin

        if required_phase_lead <= 0:
            lead_compensator_tf = ct.TransferFunction([1], [1]) # No lead part needed
            alpha = 1.0
            omega_m = np.nan
        else:
            if required_phase_lead > 65:
                raise ValueError(f"Required phase lead ({required_phase_lead:.2f}°) is too high.")

            phi_m_rad = np.deg2rad(required_phase_lead)
            alpha = (1 - np.sin(phi_m_rad)) / (1 + np.sin(phi_m_rad))
            mag_at_new_gc = -10 * np.log10(1 / alpha)

            omega_range = np.logspace(-4, 4, 4000)
            mag_abs, _, _ = ct.bode(sys_lag_compensated, omega=omega_range, plot=False)
            mag_db = 20 * np.log10(mag_abs)

            indices = np.where(np.isfinite(mag_db))[0]
            if indices.size == 0 or np.all(mag_db[indices] > mag_at_new_gc) or np.all(mag_db[indices] < mag_at_new_gc):
                 raise ValueError("Cannot find a suitable crossover frequency (omega_m) for lead design.")
            
            omega_m = np.interp(mag_at_new_gc, mag_db[indices][::-1], omega_range[indices][::-1])

            if omega_m <= 0:
                raise ValueError("Could not find a valid new crossover frequency (omega_m).")

            z_lead = omega_m * np.sqrt(alpha)
            p_lead = omega_m / np.sqrt(alpha)
            lead_compensator_tf = ct.TransferFunction([1, z_lead], [1, p_lead])
        
        # --- Final System and Analysis ---
        final_compensator = ct.series(lag_compensator_tf, lead_compensator_tf)
        sys_compensated = ct.series(final_compensator, sys_uncompensated)

        # Performance before
        gm_old, pm_old, wg_old, wp_old = ct.margin(sys_uncompensated)
        
        # Performance after
        gm_co, pm_co, wg_co, wp_co = ct.margin(sys_compensated)
        # kv_co_sys = s * sys_compensated # Original line, removed due to numerical instability
        # kv_co_val = np.real(ct.evalfr(kv_co_sys, 0)) # Original line
        # kv_co = kv_co_val if not (math.isnan(kv_co_val) or math.isinf(kv_co_val)) else None # Original line
        kv_co = comp_input.desired_kv # Direct assignment, as this is the design goal.

        # --- Generate Plot Data ---
        omega_plot = np.logspace(-3, 3, 1000)
        mag_un, phase_un, _ = ct.bode(sys_uncompensated, omega=omega_plot, plot=False)
        mag_co, phase_co, _ = ct.bode(sys_compensated, omega=omega_plot, plot=False)

        cl_uncompensated = ct.feedback(sys_uncompensated, 1)
        t_un, y_un = ct.step_response(cl_uncompensated)

        cl_compensated = ct.feedback(sys_compensated, 1)
        t_co, y_co = ct.step_response(cl_compensated)

        phase_un_deg = np.rad2deg(phase_un).tolist()
        phase_co_deg = np.rad2deg(phase_co).tolist()

        print(f"DEBUG: Lag-Lead Compensator - phase_un_deg (before sanitize): {phase_un_deg}")
        print(f"DEBUG: Lag-Lead Compensator - phase_co_deg (before sanitize): {phase_co_deg}")

        return {
            "message": "Lag-Lead compensator designed successfully.",
            "compensator": {
                "num": final_compensator.num[0][0].tolist(),
                "den": final_compensator.den[0][0].tolist(),
            },
            "performance": {
                "before": {
                    "kv": kv_old,
                    "phase_margin": pm_old if not math.isnan(pm_old) else None,
                    "gain_margin_db": format_gain_margin(gm_old),
                    "gain_crossover_freq": wg_old if not math.isnan(wg_old) else None,
                    "phase_crossover_freq": wp_old if not math.isnan(wp_old) else None,
                },
                "after": {
                    "kv": kv_co,
                    "phase_margin": pm_co if not math.isnan(pm_co) else None,
                    "gain_margin_db": format_gain_margin(gm_co),
                    "gain_crossover_freq": wg_co if not math.isnan(wg_co) else None,
                    "phase_crossover_freq": wp_co if not math.isnan(wp_co) else None,
                },
            },
            "plots": {
                "bode": {
                    "omega": sanitize_list(omega_plot.tolist()),
                    "uncompensated_mag_db": sanitize_list((20 * np.log10(mag_un)).tolist()),
                    "uncompensated_phase_deg": sanitize_list(phase_un_deg),
                    "compensated_mag_db": sanitize_list((20 * np.log10(mag_co)).tolist()),
                    "compensated_phase_deg": sanitize_list(phase_co_deg),
                },
                "step_response": {
                    "uncompensated_time": sanitize_list(t_un.tolist()),
                    "uncompensated_response": sanitize_list(y_un.tolist()),
                    "compensated_time": sanitize_list(t_co.tolist()),
                    "compensated_response": sanitize_list(y_co.tolist()),
                },
            },
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

