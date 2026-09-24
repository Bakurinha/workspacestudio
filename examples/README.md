# Exemplo rápido

Importe `inventario-exemplo.csv`, entre em modo **Edição**, abra **Regras** e escolha **Serial sequencial**.

Modelo sugerido:

```text
ABCY-{COLUMN:Marca}-{COLUMN:Modelo}-{SEQ:4}-AABA
```

Resultado esperado na coluna `Serial`:

```text
ABCY-DELL-P2422H-0001-AABA
ABCY-DELL-P2422H-0002-AABA
ABCY-DELL-P2422H-0003-AABA
ABCY-DELL-P2422H-0004-AABA
```
