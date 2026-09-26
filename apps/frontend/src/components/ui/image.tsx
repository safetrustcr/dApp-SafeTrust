import NextImage, { type ImageProps as NextImageProps } from "next/image";
import { cn } from "@/lib/utils";

const skipOptimization = (src: NextImageProps["src"]) =>
  typeof src === "string" &&
  (src.startsWith("data:") || src.toLowerCase().endsWith(".svg"));

export type ImageProps = NextImageProps & { alt: string };

export function Image({ className, unoptimized, ...props }: ImageProps) {
  return (
    <NextImage
      className={cn(className)}
      unoptimized={unoptimized ?? skipOptimization(props.src)}
      {...props}
    />
  );
}

export default Image;
