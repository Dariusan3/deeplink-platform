-- Atomic increment for A/B test conversion counters.
-- Avoids race conditions from concurrent read-then-write patterns.
CREATE OR REPLACE FUNCTION public.increment_ab_conversion(
  p_test_id UUID,
  p_variant TEXT,
  p_revenue NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  IF p_variant = 'a' THEN
    UPDATE public.ab_tests
    SET variant_a_conversions = variant_a_conversions + 1,
        variant_a_revenue = variant_a_revenue + p_revenue,
        updated_at = now()
    WHERE id = p_test_id;
  ELSIF p_variant = 'b' THEN
    UPDATE public.ab_tests
    SET variant_b_conversions = variant_b_conversions + 1,
        variant_b_revenue = variant_b_revenue + p_revenue,
        updated_at = now()
    WHERE id = p_test_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
