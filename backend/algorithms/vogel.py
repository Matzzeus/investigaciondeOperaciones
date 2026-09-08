from __future__ import annotations

from .base import EPSILON, TransportationBaseSolver


class VogelSolver(TransportationBaseSolver):
    def solve(self) -> dict:
        iteration = 1

        while len(self._active_row_indexes()) > 1 and len(self._active_col_indexes()) > 1:
            row_penalties = self._calculate_row_penalties()
            col_penalties = self._calculate_col_penalties()
            selected = self._select_penalty(row_penalties, col_penalties)
            row_index, col_index = self._select_cell_from_penalty(selected)
            assignment = self._assign(row_index, col_index)

            # Vogel decide por penalizacion; la asignacion se hace en la celda barata de esa linea.
            self.history.append(
                {
                    "iteration": iteration,
                    "type": "vogel",
                    "row_penalties": row_penalties,
                    "column_penalties": col_penalties,
                    "selected_penalty": selected,
                    "decision": self._build_decision_text(selected, assignment),
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

        while self._has_pending_work():
            row_index, col_index = self._find_global_min_cell()
            assignment = self._assign(row_index, col_index)

            # Al quedar una sola fila o columna activa, se completa con la regla de costo minimo.
            self.history.append(
                {
                    "iteration": iteration,
                    "type": "cierre_costo_minimo",
                    "decision": (
                        f"Cierre por costo minimo en {assignment['row_label']} -> "
                        f"{assignment['column_label']}."
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

        return self._result_payload("Vogel")

    def _calculate_row_penalties(self) -> list[dict]:
        penalties: list[dict] = []
        active_columns = self._active_col_indexes()

        for row_index in self._active_row_indexes():
            costs = sorted(self.costs[row_index][col_index] for col_index in active_columns)
            penalty = self._penalty_from_costs(costs)
            penalties.append(
                {
                    "type": "row",
                    "index": row_index,
                    "label": self.origin_labels[row_index],
                    "penalty": self._clean_number(penalty),
                    "min_cost": self._clean_number(costs[0]),
                }
            )

        return penalties

    def _calculate_col_penalties(self) -> list[dict]:
        penalties: list[dict] = []
        active_rows = self._active_row_indexes()

        for col_index in self._active_col_indexes():
            costs = sorted(self.costs[row_index][col_index] for row_index in active_rows)
            penalty = self._penalty_from_costs(costs)
            penalties.append(
                {
                    "type": "column",
                    "index": col_index,
                    "label": self.destination_labels[col_index],
                    "penalty": self._clean_number(penalty),
                    "min_cost": self._clean_number(costs[0]),
                }
            )

        return penalties

    def _penalty_from_costs(self, costs: list[float]) -> float:
        if not costs:
            return 0.0
        if len(costs) == 1:
            return costs[0]
        return costs[1] - costs[0]

    def _select_penalty(self, row_penalties: list[dict], col_penalties: list[dict]) -> dict:
        candidates = row_penalties + col_penalties
        if not candidates:
            raise ValueError("No hay penalizaciones activas para continuar con Vogel.")

        def sort_key(candidate: dict) -> tuple:
            line_order = 0 if candidate["type"] == "row" else 1
            return (-float(candidate["penalty"]), float(candidate["min_cost"]), line_order, int(candidate["index"]))

        selected = sorted(candidates, key=sort_key)[0]
        return dict(selected)

    def _select_cell_from_penalty(self, selected: dict) -> tuple[int, int]:
        best_cell: tuple[int, int] | None = None
        best_cost: float | None = None

        if selected["type"] == "row":
            row_index = int(selected["index"])
            for col_index in self._active_col_indexes():
                cost = self.costs[row_index][col_index]
                if best_cost is None or cost < best_cost - EPSILON:
                    best_cost = cost
                    best_cell = (row_index, col_index)
        else:
            col_index = int(selected["index"])
            for row_index in self._active_row_indexes():
                cost = self.costs[row_index][col_index]
                if best_cost is None or cost < best_cost - EPSILON:
                    best_cost = cost
                    best_cell = (row_index, col_index)

        if best_cell is None:
            raise ValueError("No se encontro celda activa para la penalizacion seleccionada.")

        return best_cell

    def _build_decision_text(self, selected: dict, assignment: dict) -> str:
        line_kind = "fila" if selected["type"] == "row" else "columna"
        return (
            f"Penalizacion maxima en {line_kind} {selected['label']} "
            f"con valor {selected['penalty']}. Se asigna en "
            f"{assignment['row_label']} -> {assignment['column_label']}."
        )

