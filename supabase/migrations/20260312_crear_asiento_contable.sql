-- ============================================================
-- Funcion RPC: crear_asiento_contable
-- Garantiza atomicidad al insertar header + lineas en una sola transaccion.
-- Valida partida doble (DEBE == HABER) y minimo 2 lineas.
-- Tablas reales: journal_entries + journal_lines + chart_of_accounts
-- ============================================================

CREATE OR REPLACE FUNCTION crear_asiento_contable(
  p_society_id   UUID,
  p_entry_date   DATE,
  p_description  TEXT,
  p_reference    TEXT DEFAULT NULL,
  p_source       TEXT DEFAULT 'manual',
  p_lines        JSONB DEFAULT '[]'::JSONB,
  p_created_by   TEXT DEFAULT NULL,
  p_attachment_url TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entry_id     UUID;
  v_entry_number INT;
  v_total_debe   NUMERIC(15,2) := 0;
  v_total_haber  NUMERIC(15,2) := 0;
  v_line_count   INT;
  v_period_year  INT := EXTRACT(YEAR FROM p_entry_date)::INT;
  v_period_month INT := EXTRACT(MONTH FROM p_entry_date)::INT;
  v_line         JSONB;
  v_line_idx     INT := 0;
  v_account_id   UUID;
  v_period_status TEXT;
BEGIN
  -- 1. Verificar que el periodo no este cerrado
  SELECT status INTO v_period_status
  FROM accounting_periods
  WHERE society_id = p_society_id
    AND period_year = v_period_year
    AND period_month = v_period_month;

  IF v_period_status = 'closed' THEN
    RAISE EXCEPTION 'El periodo %/% esta cerrado. No se pueden agregar asientos.',
      v_period_month, v_period_year;
  END IF;

  -- 2. Validar minimo 2 lineas
  v_line_count := jsonb_array_length(p_lines);
  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Un asiento debe tener al menos 2 lineas. Recibidas: %', v_line_count;
  END IF;

  -- 3. Calcular totales y validar cada linea
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_total_debe  := v_total_debe  + COALESCE((v_line->>'debe')::NUMERIC, 0);
    v_total_haber := v_total_haber + COALESCE((v_line->>'haber')::NUMERIC, 0);

    -- Validar que la cuenta existe en el plan de cuentas
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE society_id = p_society_id
      AND account_code = v_line->>'account_code';

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Cuenta % no encontrada en el plan de cuentas.',
        v_line->>'account_code';
    END IF;
  END LOOP;

  -- 4. Validar partida doble: DEBE == HABER
  IF v_total_debe != v_total_haber THEN
    RAISE EXCEPTION 'Asiento desbalanceado: DEBE $% != HABER $%. Diferencia: $%',
      v_total_debe, v_total_haber, ABS(v_total_debe - v_total_haber);
  END IF;

  -- 5. Insertar header del asiento (entry_number es SERIAL, se asigna automaticamente)
  INSERT INTO journal_entries(
    society_id, entry_date, description, reference, source,
    period_year, period_month, total_debe, total_haber,
    created_by, attachment_url
  )
  VALUES (
    p_society_id, p_entry_date, p_description, p_reference, p_source,
    v_period_year, v_period_month, v_total_debe, v_total_haber,
    p_created_by, p_attachment_url
  )
  RETURNING id, entry_number INTO v_entry_id, v_entry_number;

  -- 6. Insertar lineas del asiento
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    -- Resolver account_id
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE society_id = p_society_id
      AND account_code = v_line->>'account_code';

    INSERT INTO journal_lines(
      journal_entry_id, account_id, account_code,
      description, debe, haber, line_order
    )
    VALUES (
      v_entry_id,
      v_account_id,
      v_line->>'account_code',
      COALESCE(v_line->>'description', ''),
      COALESCE((v_line->>'debe')::NUMERIC, 0),
      COALESCE((v_line->>'haber')::NUMERIC, 0),
      v_line_idx
    );
    v_line_idx := v_line_idx + 1;
  END LOOP;

  -- 7. Retornar resultado
  RETURN jsonb_build_object(
    'id', v_entry_id,
    'entry_number', v_entry_number,
    'total_debe', v_total_debe,
    'total_haber', v_total_haber,
    'lines_count', v_line_count
  );

-- Rollback automatico en PL/pgSQL si hay error
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

COMMENT ON FUNCTION crear_asiento_contable IS
  'Crea un asiento contable atomico con validacion de partida doble. Usado por el backend via db.rpc().';
