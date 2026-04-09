"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Camera,
  Check,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  Phone,
  Quote,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const FRAME_COUNT = 168;
const SCROLL_SENSITIVITY = 0.00115;
const FRAME_SCALE = 1.12;

function buildFrameSources() {
  return Array.from(
    { length: FRAME_COUNT },
    (_, index) => `/frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.png`,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ScrollImageSequence({
  sectionRef,
  onSequenceCompleteChange,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  onSequenceCompleteChange: (complete: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameSources = useMemo(() => buildFrameSources(), []);
  const frameImagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const progressRef = useRef(0);
  const drawRafRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const originalBodyOverflowRef = useRef<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadedCount = 0;

    const images = frameSources.map((src) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;

      const complete = () => {
        loadedCount += 1;
        if (!cancelled && loadedCount === frameSources.length) {
          frameImagesRef.current = images;
          setImagesLoaded(true);
        }
      };

      image.addEventListener("load", complete, { once: true });
      image.addEventListener("error", complete, { once: true });

      return image;
    });

    frameImagesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, [frameSources]);

  useEffect(() => {
    if (!imagesLoaded || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const drawFrame = () => {
      const image = frameImagesRef.current[frameIndexRef.current];
      if (!image) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);

      const scale = Math.min(width / image.width, height / image.height) * FRAME_SCALE;
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;

      context.drawImage(image, x, y, drawWidth, drawHeight);
    };

    const queueDraw = () => {
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }

      drawRafRef.current = window.requestAnimationFrame(drawFrame);
    };

    queueDraw();

    const onResize = () => {
      queueDraw();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }
    };
  }, [imagesLoaded]);

  useEffect(() => {
    if (!imagesLoaded) {
      return;
    }

    const updateProgress = (nextProgress: number) => {
      const clampedProgress = clamp(nextProgress, 0, 1);
      progressRef.current = clampedProgress;

      const nextFrameIndex = clamp(Math.floor(clampedProgress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);
      frameIndexRef.current = nextFrameIndex;

      const isComplete = clampedProgress >= 0.999;
      setSequenceComplete(isComplete);
      onSequenceCompleteChange(isComplete);

      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }

      drawRafRef.current = window.requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const image = frameImagesRef.current[frameIndexRef.current];
        if (!image) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const height = Math.max(1, Math.floor(rect.height * dpr));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        context.clearRect(0, 0, width, height);

        const scale = Math.min(width / image.width, height / image.height) * FRAME_SCALE;
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        context.drawImage(image, x, y, drawWidth, drawHeight);
      });
    };

    const shouldControlSequence = () => {
      const section = sectionRef.current;
      if (!section) {
        return false;
      }

      const rect = section.getBoundingClientRect();
      return rect.top <= 1 && rect.bottom > window.innerHeight * 0.5;
    };

    const onWheel = (event: WheelEvent) => {
      if (!shouldControlSequence()) {
        return;
      }

      const movingForward = event.deltaY > 0;
      const movingBackward = event.deltaY < 0;
      const canAdvance = movingForward && progressRef.current < 1;
      const canReverse = movingBackward && progressRef.current > 0 && window.scrollY <= 4;

      if (!canAdvance && !canReverse) {
        return;
      }

      event.preventDefault();
      updateProgress(progressRef.current + event.deltaY * SCROLL_SENSITIVITY);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!shouldControlSequence() || touchStartRef.current === null) {
        return;
      }

      const currentY = event.touches[0]?.clientY;
      if (typeof currentY !== "number") {
        return;
      }

      const deltaY = touchStartRef.current - currentY;
      const movingForward = deltaY > 0;
      const movingBackward = deltaY < 0;
      const canAdvance = movingForward && progressRef.current < 1;
      const canReverse = movingBackward && progressRef.current > 0 && window.scrollY <= 4;

      if (!canAdvance && !canReverse) {
        return;
      }

      event.preventDefault();
      updateProgress(progressRef.current + deltaY * SCROLL_SENSITIVITY * 1.4);
      touchStartRef.current = currentY;
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [imagesLoaded, onSequenceCompleteChange, sectionRef]);

  useEffect(() => {
    if (originalBodyOverflowRef.current === null) {
      originalBodyOverflowRef.current = document.body.style.overflow;
    }

    if (!sequenceComplete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalBodyOverflowRef.current;
    }

    return () => {
      if (originalBodyOverflowRef.current !== null) {
        document.body.style.overflow = originalBodyOverflowRef.current;
      }
    };
  }, [sequenceComplete]);

  if (!imagesLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-white/20 text-white/70">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16" />
          <p className="text-base font-medium">Loading preview</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} className="h-full w-full" />
    </>
  );
}

export default function SareeEcommerceLanding() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const [sequenceComplete, setSequenceComplete] = useState(false);

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Fashion Enthusiast",
      content: "The quality of sarees is exceptional. The preview helped me choose the perfect one with confidence.",
      rating: 5,
      image: "PS",
    },
    {
      name: "Anjali Patel",
      role: "Bride-to-be",
      content: "Found my dream wedding saree here. The collection feels premium and the designs are truly elegant.",
      rating: 5,
      image: "AP",
    },
    {
      name: "Meera Reddy",
      role: "Regular Customer",
      content: "Fast delivery, beautiful packaging, and a luxurious feel from start to finish. I will order again.",
      rating: 5,
      image: "MR",
    },
  ];

  const features = [
    {
      icon: Sparkles,
      title: "Premium Quality",
      description: "Handpicked sarees with fine fabrics, elegant drape, and polished finish.",
      color: "from-[#CA6180] to-[#FCB7C7]",
    },
    {
      icon: Shield,
      title: "100% Authentic",
      description: "Carefully sourced pieces with craftsmanship you can trust and wear proudly.",
      color: "from-[#8bbbc4] to-[#9ED3DC]",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick and secure shipping across the country with thoughtful packaging.",
      color: "from-[#f2a7bb] to-[#CA6180]",
    },
    {
      icon: Award,
      title: "Expert Curation",
      description: "Each edit is built for occasion dressing, gifting, and timeless wardrobe building.",
      color: "from-[#f5c8a9] to-[#f2a46a]",
    },
  ];

  const pricingPlans = [
    {
      name: "Classic Collection",
      price: "₹2,999",
      description: "Perfect for everyday elegance",
      features: ["Cotton & silk blend", "Traditional designs", "Free shipping", "Easy returns"],
      popular: false,
    },
    {
      name: "Premium Collection",
      price: "₹5,999",
      description: "For special occasions",
      features: ["Pure silk sarees", "Designer patterns", "Priority shipping", "Gift packaging", "Styling guide"],
      popular: true,
    },
    {
      name: "Luxury Collection",
      price: "₹12,999",
      description: "Ultimate bridal elegance",
      features: [
        "Handwoven silk",
        "Exclusive designs",
        "Express delivery",
        "Premium packaging",
        "Personal stylist",
        "Lifetime support",
      ],
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "What is your return policy?",
      answer: "We offer a 7-day return policy for all products. Items must be unused and in original packaging.",
    },
    {
      question: "How long does shipping take?",
      answer: "Standard shipping takes 5 to 7 business days. Express shipping is available for 2 to 3 day delivery.",
    },
    {
      question: "Are the sarees authentic?",
      answer: "Yes, all our sarees are authentic and sourced directly from trusted partners and makers.",
    },
    {
      question: "Do you offer international shipping?",
      answer: "Currently we ship within India. International shipping can be enabled later if you want that flow added.",
    },
    {
      question: "Can I customize my order?",
      answer: "Yes, we can support customization for bulk and occasion-led orders. Reach out through the contact section.",
    },
  ];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [testimonials.length]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #9ED3DC 0%, #FCB7C7 50%, #CA6180 100%)",
        }}
      >
        <motion.div
          style={{
            opacity: 1 - (sequenceComplete ? 0.82 : 0),
            scale: sequenceComplete ? 0.94 : 1,
          }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_24%)]" />
        </motion.div>

        <div className="container relative z-10 mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(320px,0.92fr)_minmax(500px,1.08fr)] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-[34rem] text-white"
            >
              <Badge className="mb-4 border-white/30 bg-white/20 px-3 py-1 text-white backdrop-blur-sm">
                <Sparkles className="mr-1 h-3 w-3" />
                New Collection 2024
              </Badge>
              <h1 className="text-5xl font-bold leading-[0.96] sm:text-6xl lg:text-[5.25rem]">
                Elegance in
                <span className="block bg-gradient-to-r from-white to-pink-100 bg-clip-text text-transparent">
                  Every Thread
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/90 sm:text-xl">
                Experience the beauty of traditional sarees with an immersive preview, curated collections, and a soft
                luxury shopping journey.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-w-[11rem] rounded-full border-white/55 bg-white/8 px-8 text-base font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm hover:bg-white/14 hover:text-white"
                >
                  <a href="#features">View Catalog</a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex items-center justify-center lg:justify-end"
            >
              <div className="relative h-[80svh] w-full max-w-[34rem] overflow-hidden rounded-[2.15rem] border-4 border-white/20 bg-white/10 p-3 shadow-[0_40px_140px_rgba(95,35,51,0.24)] backdrop-blur-md sm:h-[84svh] sm:max-w-[38rem] lg:h-[88svh] lg:max-w-[42rem] xl:max-w-[44rem]">
                <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-white/18">
                  <ScrollImageSequence sectionRef={heroRef} onSequenceCompleteChange={setSequenceComplete} />
                </div>
              </div>
              <div className="absolute -left-6 top-[8%] h-32 w-32 rounded-full bg-[#9ED3DC] opacity-50 blur-3xl" />
              <div className="absolute -bottom-6 right-[4%] h-32 w-32 rounded-full bg-[#FCB7C7] opacity-50 blur-3xl" />
            </motion.div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white"
        >
          <ChevronRight className="h-8 w-8 rotate-90" />
        </motion.div>
      </section>

      <section className="bg-gradient-to-br from-[#9ED3DC]/20 to-[#FCB7C7]/20 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl font-bold sm:text-5xl">Trusted by Thousands</h2>
            <p className="mt-4 text-lg text-muted-foreground">Join a growing community of delighted saree customers.</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { number: "10K+", label: "Happy Customers" },
              { number: "500+", label: "Saree Designs" },
              { number: "50+", label: "Cities Covered" },
              { number: "4.9★", label: "Average Rating" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2 bg-gradient-to-r from-[#CA6180] to-[#FCB7C7] bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge className="mb-4" variant="outline">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Unmatched Quality & Service</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              We bring you a premium saree buying experience built on trust, taste, and thoughtful presentation.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-2 border-white/50 bg-white/80 shadow-lg backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl">
                  <CardHeader>
                    <div
                      className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
                    >
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="py-20"
        style={{
          background: "linear-gradient(to bottom, rgba(158, 211, 220, 0.08), rgba(252, 183, 199, 0.08))",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge className="mb-4" variant="outline">
              Pricing
            </Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Choose Your Perfect Saree</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              From everyday elegance to bridal luxury, each tier is built for a different moment.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full border-white/50 bg-white/85 shadow-xl backdrop-blur-sm ${
                    plan.popular ? "border-2 border-[#CA6180] shadow-2xl" : ""
                  }`}
                >
                  {plan.popular ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-[#CA6180] to-[#FCB7C7] px-3 py-1 text-white">
                        Most Popular
                      </Badge>
                    </div>
                  ) : null}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground"> onwards</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full ${plan.popular ? "bg-gradient-to-r from-[#CA6180] to-[#FCB7C7] text-white" : ""}`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Shop Now
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge className="mb-4" variant="outline">
              Testimonials
            </Badge>
            <h2 className="text-4xl font-bold md:text-5xl">What Our Customers Say</h2>
          </motion.div>

          <div className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-white/50 bg-gradient-to-br from-[#9ED3DC]/20 to-[#FCB7C7]/20 p-8 shadow-xl">
                  <CardContent className="pt-6">
                    <Quote className="mb-4 h-12 w-12 text-[#CA6180]" />
                    <p className="mb-6 text-xl italic">
                      &ldquo;{testimonials[activeTestimonial].content}&rdquo;
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#CA6180] to-[#FCB7C7] text-xl font-bold text-white">
                        {testimonials[activeTestimonial].image}
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{testimonials[activeTestimonial].name}</div>
                        <div className="text-muted-foreground">{testimonials[activeTestimonial].role}</div>
                        <div className="mt-1 flex gap-1">
                          {Array.from({ length: testimonials[activeTestimonial].rating }).map((_, index) => (
                            <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-center gap-2">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  onClick={() => setActiveTestimonial(index)}
                  className={`h-3 rounded-full transition-all ${
                    index === activeTestimonial ? "w-8 bg-[#CA6180]" : "w-3 bg-gray-300"
                  }`}
                  aria-label={`Show testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-20"
        style={{
          background: "linear-gradient(to top, rgba(158, 211, 220, 0.08), rgba(252, 183, 199, 0.08))",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge className="mb-4" variant="outline">
              FAQ
            </Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Frequently Asked Questions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Everything you need to know about our sarees, delivery, and service.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`item-${index}`}
                  className="rounded-lg border bg-background/90 px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      <section id="contact" className="bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge className="mb-4" variant="outline">
              Contact Us
            </Badge>
            <h2 className="text-4xl font-bold md:text-5xl">Get in Touch</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Have questions? We would love to hear from you.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-white/50 bg-white/85 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Send us a message</CardTitle>
                  <CardDescription>Fill out the form and we will get back to you within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Name</label>
                    <Input placeholder="Your name" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email</label>
                    <Input type="email" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Message</label>
                    <Textarea placeholder="Your message..." rows={5} />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#CA6180] to-[#FCB7C7] text-white hover:opacity-95">
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Card className="border-white/50 bg-white/85 shadow-lg backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#9ED3DC] to-[#FCB7C7]">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">Email</h3>
                      <p className="text-muted-foreground">support@aarvisarees.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/50 bg-white/85 shadow-lg backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FCB7C7] to-[#CA6180]">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">Phone</h3>
                      <p className="text-muted-foreground">+91 98765 43210</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/50 bg-white/85 shadow-lg backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#CA6180] to-[#9ED3DC]">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">Address</h3>
                      <p className="text-muted-foreground">123 Fashion Street, Mumbai, Maharashtra 400001</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/50 bg-gradient-to-br from-[#9ED3DC]/20 to-[#FCB7C7]/20 shadow-lg">
                <CardContent className="pt-6">
                  <h3 className="mb-4 font-semibold">Follow Us</h3>
                  <div className="flex gap-4">
                    <Button size="icon" variant="outline" className="rounded-full bg-white/70">
                      <Globe className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full bg-white/70">
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full bg-white/70">
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <footer
        className="py-12 text-white"
        style={{
          background: "linear-gradient(135deg, #CA6180 0%, #FCB7C7 50%, #9ED3DC 100%)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Aarvi Sarees</h3>
              <p className="mt-4 text-white/80">
                Bringing you the finest collection of traditional and modern sarees with a fresh luxury feel.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <a href="#features" className="transition-colors hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-white">
                    Collections
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-white">
                    New Arrivals
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-white">
                    Sale
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Support</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Shipping Info
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Returns
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Newsletter</h4>
              <p className="mb-4 text-white/80">Subscribe for exclusive offers</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Your email"
                  className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
                />
                <Button variant="secondary" className="bg-white text-[#CA6180] hover:bg-white/90">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Separator className="mb-8 bg-white/20" />
          <div className="flex flex-col items-center justify-between gap-4 text-white/80 md:flex-row">
            <p>© 2024 Aarvi Sarees. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
