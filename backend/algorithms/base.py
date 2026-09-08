from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

EPSILON = 1e-9


@dataclass
class BalanceInfo:
    balanced: bool
    original_rows: int
    original_cols: int
    total_supply: float
    total_demand: float
    added_type: str | None = None
    added_label: str | None = None
    added_amount: float = 0.0


class TransportationBaseSolver:
    def __init__(self, costs: list[list[float]], supply: list[float], demand: list[float]) -> None:
        self.costs = [[float(value) for value in row] for row in costs]
        self.supply = [float(value) for value in supply]
        self.demand = [float(value) for value in demand]

        self._validate_problem()

        self.original_rows = len(self.supply)
        self.original_cols = len(self.demand)
        self.origin_labels = [f"O{i + 1}" for i in range(self.original_rows)]
        self.destination_labels = [f"D{j + 1}" for j in range(self.original_cols)]

        self.balance_info = self._balance_problem()
        self.rows = len(self.supply)
        self.cols = len(self.demand)

        self.remaining_supply = self.supply.copy()
        self.remaining_demand = self.demand.copy()
        self.active_rows = [value > EPSILON for value in self.remaining_supply]
        self.active_cols = [value > EPSILON for value in self.remaining_demand]
        self.allocations = [[0.0 for _ in range(self.cols)] for _ in range(self.rows)]
        self.history: list[dict] = []
        self.accumulated_cost = 0.0

    def _validate_problem(self) -> None:
        if not self.costs or not self.costs[0]:
            raise ValueError("La matriz de costos no puede estar vacia.")

        expected_cols = len(self.costs[0])
        if any(len(row) != expected_cols for row in self.costs):
            raise ValueError("Todas las filas de costos deben tener la misma cantidad de destinos.")

        if len(self.supply) != len(self.costs):
            raise ValueError("La cantidad de ofertas debe coincidir con el numero de origenes.")

        if len(self.demand) != expected_cols:
            raise ValueError("La cantidad de demandas debe coincidir con el numero de destinos.")

        values = [value for row in self.costs for value in row] + self.supply + self.demand
        if any(not isfinite(value) for value in values):
            raise ValueError("Todos los valores deben ser numericos finitos.")

        if any(value < 0 for value in values):
            raise ValueError("El problema contiene un valor negativo; solo se aceptan valores positivos o cero.")

        if sum(self.supply) <= EPSILON or sum(self.demand) <= EPSILON:
            raise ValueError("La oferta y la demanda total deben ser mayores que cero.")

    def _balance_problem(self) -> BalanceInfo:
        total_supply = sum(self.supply)
        total_demand = sum(self.demand)

        info = BalanceInfo(
            balanced=abs(total_supply - total_demand) <= EPSILON,
            original_rows=len(self.supply),
            original_cols=len(self.demand),
            total_supply=total_supply,
            total_demand=total_demand,
        )

        if info.balanced:
            return info

        difference = abs(total_supply - total_demand)

        if total_supply > total_demand:
            self.demand.append(difference)
            self.destination_labels.append("Destino ficticio")
            for row in self.costs:
                row.append(0.0)
            info.added_type = "column"
            info.added_label = "Destino ficticio"
        else:
            self.supply.append(difference)
            self.origin_labels.append("Origen ficticio")
            self.costs.append([0.0 for _ in self.demand])
            info.added_type = "row"
            info.added_label = "Origen ficticio"

        info.added_amount = difference
        return info

    def _active_row_indexes(self) -> list[int]:
        return [
            row_index
            for row_index, is_active in enumerate(self.active_rows)
            if is_active and self.remaining_supply[row_index] > EPSILON
        ]

    def _active_col_indexes(self) -> list[int]:
        return [
            col_index
            for col_index, is_active in enumerate(self.active_cols)
            if is_active and self.remaining_demand[col_index] > EPSILON
        ]

    def _has_pending_work(self) -> bool:
        return bool(self._active_row_indexes()) and bool(self._active_col_indexes())

    def _find_global_min_cell(self) -> tuple[int, int]:
        best_cell: tuple[int, int] | None = None
        best_cost: float | None = None

        for row_index in self._active_row_indexes():
            for col_index in self._active_col_indexes():
                cost = self.costs[row_index][col_index]
                if best_cost is None or cost < best_cost:
                    best_cost = cost
                    best_cell = (row_index, col_index)

        if best_cell is None:
            raise ValueError("No existe una celda activa para continuar la asignacion.")

        return best_cell

    def _assign(self, row_index: int, col_index: int) -> dict:
        quantity = min(self.remaining_supply[row_index], self.remaining_demand[col_index])
        unit_cost = self.costs[row_index][col_index]

        self.allocations[row_index][col_index] += quantity
        self.remaining_supply[row_index] -= quantity
        self.remaining_demand[col_index] -= quantity
        self.accumulated_cost += quantity * unit_cost

        crossed_out: list[str] = []

        # Si ambos saldos llegan a cero, se puede cerrar fila y columna sin afectar el costo.
        if self.remaining_supply[row_index] <= EPSILON:
            self.remaining_supply[row_index] = 0.0
            self.active_rows[row_index] = False
            crossed_out.append(self.origin_labels[row_index])

        if self.remaining_demand[col_index] <= EPSILON:
            self.remaining_demand[col_index] = 0.0
            self.active_cols[col_index] = False
            crossed_out.append(self.destination_labels[col_index])

        return {
            "row": row_index,
            "column": col_index,
            "row_label": self.origin_labels[row_index],
            "column_label": self.destination_labels[col_index],
            "quantity": quantity,
            "unit_cost": unit_cost,
            "partial_cost": quantity * unit_cost,
            "crossed_out": crossed_out,
        }

    def _cost_total(self) -> float:
        return sum(
            self.allocations[row_index][col_index] * self.costs[row_index][col_index]
            for row_index in range(self.rows)
            for col_index in range(self.cols)
        )

    def _rounded_matrix(self, matrix: list[list[float]]) -> list[list[float]]:
        return [[self._clean_number(value) for value in row] for row in matrix]

    def _clean_number(self, value: float) -> float | int:
        rounded = round(float(value), 10)
        if abs(rounded - int(rounded)) <= EPSILON:
            return int(rounded)
        return rounded

    def _remaining_snapshot(self) -> dict:
        return {
            "supply": [self._clean_number(value) for value in self.remaining_supply],
            "demand": [self._clean_number(value) for value in self.remaining_demand],
            "active_rows": [self.origin_labels[index] for index in self._active_row_indexes()],
            "active_columns": [self.destination_labels[index] for index in self._active_col_indexes()],
        }

    def _balance_payload(self) -> dict:
        return {
            "balanced": self.balance_info.balanced,
            "original_rows": self.balance_info.original_rows,
            "original_cols": self.balance_info.original_cols,
            "total_supply": self._clean_number(self.balance_info.total_supply),
            "total_demand": self._clean_number(self.balance_info.total_demand),
            "added_type": self.balance_info.added_type,
            "added_label": self.balance_info.added_label,
            "added_amount": self._clean_number(self.balance_info.added_amount),
        }

    def _result_payload(self, method_name: str) -> dict:
        return {
            "method": method_name,
            "costs": self._rounded_matrix(self.costs),
            "allocations": self._rounded_matrix(self.allocations),
            "total_cost": self._clean_number(self._cost_total()),
            "origin_labels": self.origin_labels,
            "destination_labels": self.destination_labels,
            "supply": [self._clean_number(value) for value in self.supply],
            "demand": [self._clean_number(value) for value in self.demand],
            "balance": self._balance_payload(),
            "history": self.history,
        }
