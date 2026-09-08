from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class TransportationProblem(BaseModel):
    costs: list[list[float]]
    supply: list[float]
    demand: list[float]


class ExportRequest(BaseModel):
    title: str = "Resultados de transporte"
    result: dict[str, Any]

