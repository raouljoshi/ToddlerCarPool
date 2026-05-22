import { CarGraphic } from "./CarGraphic";

interface HeroCarsProps {
  filled?: number;
  capacity?: number;
}

/**
 * Cars-filling-up hero illustration: three picture-book cars in a row,
 * `filled` of `capacity` seats tinted. Decorative by default.
 */
export function HeroCars({ filled = 3, capacity = 9 }: HeroCarsProps) {
  const slots = Array.from({ length: capacity }, (_, i) => i < filled);
  const cars = [slots.slice(0, 3), slots.slice(3, 6), slots.slice(6, 9)];

  return (
    <div className="hero-cars" role="img" aria-label="Three cars with seats filling up">
      {cars.map((carSeats, i) => (
        <CarGraphic key={i} seats={carSeats} />
      ))}
    </div>
  );
}
