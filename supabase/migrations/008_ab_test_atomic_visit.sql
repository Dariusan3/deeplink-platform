-- Atomic increment for A/B test visit counters
CREATE OR REPLACE FUNCTION public.increment_ab_visit(
  p_test_id UUID,
  p_variant TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_variant = 'a' THEN
    UPDATE public.ab_tests
    SET variant_a_visits = variant_a_visits + 1,
        updated_at = now()
    WHERE id = p_test_id;
  ELSIF p_variant = 'b' THEN
    UPDATE public.ab_tests
    SET variant_b_visits = variant_b_visits + 1,
        updated_at = now()
    WHERE id = p_test_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
