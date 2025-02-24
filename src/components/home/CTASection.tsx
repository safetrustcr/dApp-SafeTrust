import { Button } from "@/components/ui/button";

export const CTASection = () => (
  <section className="py-4 px-4 sm:px-6 lg:px-8 bg-background">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-3xl sm:text-4xl font-bold mb-4">
        Ready to Get Started?
      </h2>
      <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
        Join thousands of businesses already using our platform for their blockchain needs
      </p>
      <Button
        size="lg"
        className="text-lg px-8"
      >
        Contact Us Now
      </Button>
    </div>
  </section>
); 