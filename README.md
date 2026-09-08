# Aplicacion web para problemas de transporte

Aplicacion local con FastAPI y frontend en HTML, CSS y JavaScript para resolver problemas de transporte por:

- Metodo de Costo Minimo
- Metodo de Aproximacion de Vogel

La API balancea automaticamente el problema agregando un origen o destino ficticio con costo cero cuando la oferta total y la demanda total no coinciden.

La interfaz inicia costos, ofertas y demandas en `0`, valida valores negativos al escribir y muestra la suma de oferta contra la suma de demanda antes de ejecutar los metodos.

## Estructura

```text
backend/
  main.py
  models.py
  algorithms/
    base.py
    costo_minimo.py
    vogel.py
frontend/
  index.html
  styles.css
  app.js
requirements.txt
```

## Ejecucion

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Abrir:

```text
http://127.0.0.1:8000
```

## Endpoints

- `POST /costo-minimo`
- `POST /vogel`
- `POST /comparar`
- `POST /export/pdf`
- `POST /export/excel`

## Ejemplo balanceado

```bash
curl -X POST http://127.0.0.1:8000/costo-minimo ^
  -H "Content-Type: application/json" ^
  -d "{\"costs\":[[8,6,10],[9,12,13],[14,9,16]],\"supply\":[35,50,40],\"demand\":[45,20,60]}"
```

## Ejemplo con oferta mayor que demanda

```bash
curl -X POST http://127.0.0.1:8000/vogel ^
  -H "Content-Type: application/json" ^
  -d "{\"costs\":[[4,8],[6,3]],\"supply\":[40,30],\"demand\":[20,25]}"
```

## Ejemplo con demanda mayor que oferta

```bash
curl -X POST http://127.0.0.1:8000/costo-minimo ^
  -H "Content-Type: application/json" ^
  -d "{\"costs\":[[5,2,7],[3,6,4]],\"supply\":[30,20],\"demand\":[15,25,30]}"
```

## Comparar metodos

```bash
curl -X POST http://127.0.0.1:8000/comparar ^
  -H "Content-Type: application/json" ^
  -d "{\"costs\":[[8,6,10],[9,12,13],[14,9,16]],\"supply\":[35,50,40],\"demand\":[45,20,60]}"
```

## Criterios de desempate

Cuando existen empates, se usa una regla determinista para que el resultado sea repetible:

- Costo Minimo: menor fila y menor columna entre celdas con el mismo costo.
- Vogel: mayor penalizacion, luego menor costo dentro de la linea, luego fila antes que columna, luego indice menor.

Estos desempates no cambian las reglas principales del metodo; solo evitan resultados variables cuando hay opciones equivalentes.
