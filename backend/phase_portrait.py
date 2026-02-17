from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import control as ct

router = APIRouter()

class PhasePortraitInput(BaseModel):
    numerator: List[float]
    denominator: List[float]

def classify_equilibrium_point(sys):
    """
    Analyzes the poles of an LTI system to classify the equilibrium point at the origin.
    For higher-order systems, classification is based on the dominant two poles.
    """
    poles = sys.poles()
    if len(poles) == 0:
        return "Inconclusive (No poles)"

    # Overall stability check based on all poles
    if any(p.real > 0 for p in poles):
        stability = "Unstable"
    elif any(np.isclose(p.real, 0) for p in poles):
        imag_poles = [p for p in poles if np.isclose(p.real, 0)]
        pole_counts = {}
        for p in imag_poles:
            p_rounded = complex(round(p.real, 4), round(p.imag, 4))
            pole_counts[p_rounded] = pole_counts.get(p_rounded, 0) + 1
        if any(count > 1 for count in pole_counts.values()):
            stability = "Unstable" # Repeated poles on imag axis
        else:
            stability = "Marginally Stable"
    else:
        stability = "Stable"

    if len(poles) < 2:
        if stability == "Stable":
            return "Stable (1st Order)"
        else:
            return "Unstable (1st Order)"

    # For classification, sort poles by real part (most unstable/dominant first)
    dominant_poles = sorted(poles, key=lambda p: p.real, reverse=True)
    pole1, pole2 = dominant_poles[0], dominant_poles[1]

    # Classify type based on the two dominant poles
    if abs(pole1.imag) > 1e-6:
        # Dominant poles are a complex pair
        if stability == "Stable":
            return "Stable Focus (Spiral)"
        elif stability == "Unstable":
            return "Unstable Focus (Spiral)"
        else: # Marginally Stable
            return "Center"
    else:
        # Dominant poles are real
        if stability == "Stable":
            return "Stable Node"
        elif stability == "Unstable":
            # If dominant pole is positive and the next is negative, it has saddle characteristics
            if pole1.real > 0 and pole2.real < 0:
                return "Saddle Point"
            else:
                return "Unstable Node"
        else: # Marginally stable with real poles (e.g., integrator)
            return "Marginally Stable (Integrator)"

@router.post("/plot_phase_portrait")
async def plot_phase_portrait(pp_input: PhasePortraitInput):
    try:
        if len(pp_input.numerator) > len(pp_input.denominator):
            raise ValueError("Numerator degree cannot be greater than denominator degree.")
        
        sys_tf = ct.TransferFunction(pp_input.numerator, pp_input.denominator)
        
        if len(sys_tf.poles()) == 0:
            raise ValueError("System must have at least one pole.")

        sys_ss = ct.tf2ss(sys_tf)
        equilibrium_type = classify_equilibrium_point(sys_tf)

        trajectories = []
        x_vals = np.linspace(-10, 10, 9)
        y_vals = np.linspace(-10, 10, 9)
        
        poles = sys_tf.poles()
        # Estimate simulation time based on the slowest non-zero real part of the poles
        non_zero_reals = [abs(p.real) for p in poles if not np.isclose(p.real, 0)]
        if non_zero_reals:
            slowest_pole_real = min(non_zero_reals)
            t_settle = 5 / slowest_pole_real
            t_final = min(t_settle, 100) # Cap simulation time
        else: # Purely imaginary poles
            # Estimate based on slowest frequency
            non_zero_imags = [abs(p.imag) for p in poles if not np.isclose(p.imag, 0)]
            if non_zero_imags:
                slowest_freq = min(non_zero_imags)
                t_final = 5 * (2 * np.pi / slowest_freq) # 5 periods
            else:
                t_final = 20

        T = np.linspace(0, t_final, 500)
        A = sys_ss.A
        n_states = A.shape[0]

        for x0 in x_vals:
            for y0 in y_vals:
                if x0 == 0 and y0 == 0: continue

                # Dynamically create initial condition vector for any system order
                initial_condition = np.zeros(n_states)
                if n_states >= 1: initial_condition[0] = x0
                if n_states >= 2: initial_condition[1] = y0
                
                # Manual ODE integration (Euler method)
                dt = T[1] - T[0]
                states = np.zeros((len(T), n_states))
                states[0, :] = initial_condition
                for i in range(1, len(T)):
                    x_prime = A @ states[i-1, :]
                    states[i, :] = states[i-1, :] + dt * x_prime

                # The phase portrait plots the first state vs the second state
                trajectories.append({
                    "x": states[:, 0].tolist(),
                    "y": states[:, 1].tolist() if n_states >= 2 else [0] * len(T),
                })

        return {
            "message": "Phase portrait data generated successfully.",
            "trajectories": trajectories,
            "equilibrium_analysis": {
                "point": [0, 0],
                "type": equilibrium_type
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))