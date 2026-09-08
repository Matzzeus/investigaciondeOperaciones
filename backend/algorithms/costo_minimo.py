from __future__ import annotations

from .base import TransportationBaseSolver


class CostoMinimoSolver(TransportationBaseSolver):
    def solve(self) -> dict:
        iteration = 1

        while self._has_pending_work():
            row_index, col_index = self._find_global_min_cell()
            assignment = self._assign(row_index, col_index)

            # La celda elegida siempre es el menor costo disponible entre filas y columnas activas.
            self.history.append(
                {
                    "iteration": iteration,
                    "type": "costo_minimo",
                    "decision": (
                        f"Costo minimo encontrado en {assignment['row_label']} -> "
                        f"{assignment['column_label']} con costo {self._clean_number(assignment['unit_cost'])}."
                    ),
                    "assignment": {
                        **assignment,
                        "quantity": self._clean_number(assignment["quantity"]),
                        "unit_cost": self._clean_number(assignment["unit_cost"]),
                        "partial_cost": self._clean_number(assignment["partial_cost"]),
                    },
                    "accumulated_cost": self._clean_number(self.accumulated_cost),
                    "remaining": self._remaining_snapshot(),
                }
            )
            iteration += 1

        return self._result_payload("Costo Minimo")

