"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MessageCircle, Clock, MapPin, Send, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { InstagramIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [orderNumber, setOrderNumber] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate sending support query
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/50">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-rose-100/80 px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Here to Help You</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-serif">
            Contact & Customer Support
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            Have a question about your order, shipping, or want a custom charm? Reach out to us directly!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Quick Channels (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* WhatsApp Card */}
            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Instant WhatsApp Support</h3>
                  <p className="text-[11px] text-neutral-500">Fastest replies for order tracking</p>
                </div>
              </div>
              <p className="text-xs text-neutral-600">
                Chat with our team for quick updates, address corrections, or payment verification questions.
              </p>
              <Link
                href="https://wa.me/919876543210?text=Hello%20The%20Bling%20Corner,%20I%20have%20an%20order%20query"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Chat on WhatsApp &rarr;
              </Link>
            </div>

            {/* Instagram Card */}
            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <InstagramIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Instagram DM</h3>
                  <p className="text-[11px] text-neutral-500">@theblingcorner_</p>
                </div>
              </div>
              <p className="text-xs text-neutral-600">
                DM us on Instagram for custom jewelry inquiries, reviews, and styling questions.
              </p>
              <Link
                href="https://www.instagram.com/theblingcorner_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs transition-colors"
              >
                Send Instagram DM &rarr;
              </Link>
            </div>

            {/* Hours & Location */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3 text-xs text-neutral-600">
              <div className="flex items-center gap-2 font-bold text-neutral-900">
                <Clock className="h-4 w-4 text-rose-800" />
                <span>Support Working Hours</span>
              </div>
              <p className="text-neutral-500">
                Monday – Saturday: 10:00 AM – 7:00 PM IST<br />
                Sunday & Public Holidays: Closed (Emergencies handled on WhatsApp)
              </p>

              <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 font-bold text-neutral-900">
                <MapPin className="h-4 w-4 text-rose-800" />
                <span>Dispatch Location</span>
              </div>
              <p className="text-neutral-500">
                The Bling Corner Studio, Mumbai & Surat, India. Orders shipped safely across all Indian states via verified courier partners.
              </p>
            </div>
          </div>

          {/* Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">
              Send us an Email Message
            </h2>
            <p className="text-xs text-neutral-500 mb-6">
              Fill out the form below and our team will get back to you within 24 business hours.
            </p>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in fade-in">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-950">Message Sent Successfully!</h3>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                  Thank you for reaching out. We have received your query and will reply to <strong>{email}</strong> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage("");
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-900 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="contactName"
                    label="Your Full Name"
                    placeholder="Pooja Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    id="contactEmail"
                    label="Email Address"
                    type="email"
                    placeholder="pooja@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Input
                  id="contactOrderNumber"
                  label="Order Number (Optional)"
                  placeholder="e.g. TBC-2026-XXXX"
                  helperText="Include this if you are asking about an existing order"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />

                <div className="space-y-1">
                  <label htmlFor="contactMsg" className="block text-xs font-semibold text-neutral-700">
                    How can we help you?
                  </label>
                  <textarea
                    id="contactMsg"
                    rows={4}
                    required
                    placeholder="Tell us about your query, custom charm idea, or tracking request..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-rose-800 transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="w-full bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs h-11 rounded-xl shadow-xs"
                >
                  <Send className="h-4 w-4 mr-2" /> Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

