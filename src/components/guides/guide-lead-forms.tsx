import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Download, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { campaignContext, trackEvent } from "@/lib/analytics";
import {
  CONSENT_TEXT_DOWNLOAD,
  CONSENT_TEXT_INTRODUCTION,
  SERVICE_OPTIONS,
  SHAREHOLDER_COUNT_OPTIONS,
  TIMEFRAME_OPTIONS,
} from "@/lib/guides";
import { submitGuideDownload, submitSpecialistIntroduction } from "@/lib/guides.functions";

const fieldClass =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ErrorText({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}

function Consent({ text }: { text: string }) {
  return (
    <span>
      {text}{" "}
      <Link to="/privacy" className="underline underline-offset-2">
        Privacy policy
      </Link>{" "}
      ·{" "}
      <Link to="/terms" className="underline underline-offset-2">
        Terms
      </Link>
    </span>
  );
}

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website-url">Website</label>
      <input
        id="website-url"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/* -------------------------------------------------------------- download -- */

export function GuideDownloadForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    country: "",
    businessActivity: "",
    timeframe: "",
    consent: false,
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [started, setStarted] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) => {
    if (!started) {
      setStarted(true);
      trackEvent("form_start", { form: "guide_download" });
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next["firstName"] = "First name is required";
    if (!form.lastName.trim()) next["lastName"] = "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next["email"] = "Enter a valid business email address";
    if (form.country.trim().length < 2) next["country"] = "Country of residence is required";
    if (form.businessActivity.trim().length < 3)
      next["businessActivity"] = "Describe the proposed business activity";
    if (!form.timeframe) next["timeframe"] = "Select an expected timeframe";
    if (!form.consent) next["consent"] = "Your consent is required to send the guide";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) {
      trackEvent("form_error", { form: "guide_download" });
      return;
    }
    setStatus("sending");
    try {
      await submitGuideDownload({
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          ...(form.telephone.trim() ? { telephone: form.telephone.trim() } : {}),
          country: form.country.trim(),
          businessActivity: form.businessActivity.trim(),
          timeframe: form.timeframe,
          consent: true as const,
          ...(form.website ? { website: form.website } : {}),
          ...campaignContext(),
        },
      });
      setStatus("sent");
      trackEvent("form_submit", { form: "guide_download" });
    } catch (error) {
      setStatus("error");
      setServerError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
      trackEvent("form_error", { form: "guide_download", server: true });
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-panel">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-olive" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-lg">Your guide is ready</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We have emailed your confirmation and the guide link. You can download the full guide,
              including the registration checklist, KYC document list and compliance checklist, right
              now.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                trackEvent("guide_download", { format: "pdf_print" });
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download the guide (PDF)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-6 shadow-panel">
      <Honeypot value={form.website} onChange={(v) => setForm((p) => ({ ...p, website: v }))} />
      {status === "error" && serverError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>We could not send the guide</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dl-first">First name *</Label>
          <Input
            id="dl-first"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            autoComplete="given-name"
          />
          <ErrorText message={errors["firstName"]} />
        </div>
        <div>
          <Label htmlFor="dl-last">Last name *</Label>
          <Input
            id="dl-last"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            autoComplete="family-name"
          />
          <ErrorText message={errors["lastName"]} />
        </div>
        <div>
          <Label htmlFor="dl-email">Business email *</Label>
          <Input
            id="dl-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
          <ErrorText message={errors["email"]} />
        </div>
        <div>
          <Label htmlFor="dl-phone">Telephone (optional)</Label>
          <Input
            id="dl-phone"
            value={form.telephone}
            onChange={(e) => set("telephone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="dl-country">Country of residence *</Label>
          <Input
            id="dl-country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            autoComplete="country-name"
          />
          <ErrorText message={errors["country"]} />
        </div>
        <div>
          <Label htmlFor="dl-timeframe">Expected registration timeframe *</Label>
          <select
            id="dl-timeframe"
            className={fieldClass}
            value={form.timeframe}
            onChange={(e) => set("timeframe", e.target.value)}
          >
            <option value="">Select a timeframe</option>
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ErrorText message={errors["timeframe"]} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="dl-activity">Proposed business activity *</Label>
          <Textarea
            id="dl-activity"
            rows={3}
            value={form.businessActivity}
            onChange={(e) => set("businessActivity", e.target.value)}
          />
          <ErrorText message={errors["businessActivity"]} />
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
        />
        <Consent text={CONSENT_TEXT_DOWNLOAD} />
      </label>
      <ErrorText message={errors["consent"]} />

      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        Send Me the Free Guide
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        We send the guide you requested and reply to your enquiry. You are not added to any general
        marketing list.
      </p>
    </form>
  );
}

/* ---------------------------------------------------------- introduction -- */

export function SpecialistIntroductionForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    telephone: "",
    country: "",
    nationality: "",
    businessActivity: "",
    countriesOfOperation: "",
    shareholderCount: "",
    corporateShareholder: "",
    timeframe: "",
    additionalInformation: "",
    consent: false,
    website: "",
  });
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [started, setStarted] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) => {
    if (!started) {
      setStarted(true);
      trackEvent("form_start", { form: "specialist_introduction" });
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleService = (service: string) =>
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next["fullName"] = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next["email"] = "Enter a valid business email address";
    if (form.country.trim().length < 2) next["country"] = "Country of residence is required";
    if (form.businessActivity.trim().length < 3)
      next["businessActivity"] = "Describe the proposed business activity";
    if (!form.timeframe) next["timeframe"] = "Select a registration timeframe";
    if (!form.consent) next["consent"] = "Your consent is required to review the enquiry";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) {
      trackEvent("form_error", { form: "specialist_introduction" });
      return;
    }
    setStatus("sending");
    try {
      await submitSpecialistIntroduction({
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          ...(form.telephone.trim() ? { telephone: form.telephone.trim() } : {}),
          country: form.country.trim(),
          ...(form.nationality.trim() ? { nationality: form.nationality.trim() } : {}),
          businessActivity: form.businessActivity.trim(),
          ...(form.countriesOfOperation.trim()
            ? { countriesOfOperation: form.countriesOfOperation.trim() }
            : {}),
          ...(form.shareholderCount ? { shareholderCount: form.shareholderCount } : {}),
          ...(form.corporateShareholder
            ? { corporateShareholder: form.corporateShareholder === "yes" }
            : {}),
          timeframe: form.timeframe,
          ...(services.length > 0 ? { services } : {}),
          ...(form.additionalInformation.trim()
            ? { additionalInformation: form.additionalInformation.trim() }
            : {}),
          consent: true as const,
          ...(form.website ? { website: form.website } : {}),
          ...campaignContext(),
        },
      });
      setStatus("sent");
      trackEvent("form_submit", { form: "specialist_introduction" });
    } catch (error) {
      setStatus("error");
      setServerError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
      trackEvent("form_error", { form: "specialist_introduction", server: true });
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-panel">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-olive" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-lg">Request received</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We have emailed you a confirmation. Our team reviews each enquiry and, where
              appropriate, introduces you to an independent Cyprus company-formation specialist.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Submitting this form does not create a professional-client relationship and does not
              guarantee acceptance, incorporation or bank-account approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-6 shadow-panel">
      <Honeypot value={form.website} onChange={(v) => setForm((p) => ({ ...p, website: v }))} />
      {status === "error" && serverError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>We could not send your request</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="in-name">Full name *</Label>
          <Input
            id="in-name"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="name"
          />
          <ErrorText message={errors["fullName"]} />
        </div>
        <div>
          <Label htmlFor="in-email">Business email *</Label>
          <Input
            id="in-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
          <ErrorText message={errors["email"]} />
        </div>
        <div>
          <Label htmlFor="in-phone">Telephone / WhatsApp (optional)</Label>
          <Input
            id="in-phone"
            value={form.telephone}
            onChange={(e) => set("telephone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="in-country">Country of residence *</Label>
          <Input
            id="in-country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            autoComplete="country-name"
          />
          <ErrorText message={errors["country"]} />
        </div>
        <div>
          <Label htmlFor="in-nationality">Nationality (optional)</Label>
          <Input
            id="in-nationality"
            value={form.nationality}
            onChange={(e) => set("nationality", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="in-countries">Countries of operation (optional)</Label>
          <Input
            id="in-countries"
            value={form.countriesOfOperation}
            onChange={(e) => set("countriesOfOperation", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="in-shareholders">Number of shareholders</Label>
          <select
            id="in-shareholders"
            className={fieldClass}
            value={form.shareholderCount}
            onChange={(e) => set("shareholderCount", e.target.value)}
          >
            <option value="">Select</option>
            {SHAREHOLDER_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="in-corporate">Corporate shareholder involved?</Label>
          <select
            id="in-corporate"
            className={fieldClass}
            value={form.corporateShareholder}
            onChange={(e) => set("corporateShareholder", e.target.value)}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="in-activity">Proposed business activity *</Label>
          <Textarea
            id="in-activity"
            rows={3}
            value={form.businessActivity}
            onChange={(e) => set("businessActivity", e.target.value)}
          />
          <ErrorText message={errors["businessActivity"]} />
        </div>
        <div>
          <Label htmlFor="in-timeframe">Registration timeframe *</Label>
          <select
            id="in-timeframe"
            className={fieldClass}
            value={form.timeframe}
            onChange={(e) => set("timeframe", e.target.value)}
          >
            <option value="">Select a timeframe</option>
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ErrorText message={errors["timeframe"]} />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Services required</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SERVICE_OPTIONS.map((service) => (
            <label key={service} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={services.includes(service)}
                onChange={() => toggleService(service)}
              />
              {service}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <Label htmlFor="in-notes">Additional information (optional)</Label>
        <Textarea
          id="in-notes"
          rows={4}
          value={form.additionalInformation}
          onChange={(e) => set("additionalInformation", e.target.value)}
        />
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
        />
        <Consent text={CONSENT_TEXT_INTRODUCTION} />
      </label>
      <ErrorText message={errors["consent"]} />

      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        Request My Introduction
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Submitting this form does not create a professional-client relationship and does not
        guarantee acceptance, incorporation or bank-account approval.
      </p>
    </form>
  );
}
