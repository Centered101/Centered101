// Brand lockup for the shop: "shop" (accent) + ".centered101.com".
export function ShopBrand({
  size = "sm",
  align = "start",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  align?: "start" | "center";
  className?: string;
}) {
  const main = { sm: "text-sm md:text-base", md: "text-lg", lg: "text-3xl md:text-5xl" }[size];
  const sub = { sm: "text-[10px] md:text-xs", md: "text-xs", lg: "text-base md:text-xl" }[size];
  return (
    <span
      className={`inline-flex flex-col leading-tight ${align === "center" ? "items-center" : "items-start"} ${className}`}
    >
      <span className={`font-pixel ${main} text-primary`}>shop</span>
      <span className={`font-pixel ${sub} text-foreground`}>.centered101.com</span>
    </span>
  );
}
