import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { campaignContext, trackEvent } from "@/lib/analytics";
import {
  CONSENT_TEXT_MARKETING,
  CONSENT_TEXT_SHARING,
  COUNT_OPTIONS,
  SETUP_SERVICE_OPTIONS,
  SETUP_TIMEFRAME_OPTIONS,
  YES_NO_UNSURE_OPTIONS,
} from "@/lib/company-setup";
import { submitCompanySetupEnquiry } from "@/lib/company-setup.functions";

const fieldClass =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STEPS = ["Contact details", "Company requirements", "Services required"] as const;

function ErrorText({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

const initialForm = {
  fullName: "",
  email: "",
  telephone: "",
  country: "",
  nameOne: "",
  nameTwo: "",
  nameThree: "",
  businessActivity: "",
  shareholderCount: "",
  directorCount: "",
  corporateShareholders: "",
  regulatedActivity: "",
  regulatedActivityDetail: "",
  timeframe: "",
  services: [] as string[],
  additionalInformation: "",
  consentPrivacy: false,
  consentSharing: false,
  marketingOptIn: false,
  website: "",
};

export function CompanySetupEnquiryForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [started, setStarted] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean | string[]) => {
    if (!started) {
      setStarted(true);
      trackEvent("form_start", { form: "company_setup" });
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleService = (service: string) => {
    set(
      "services",
      form.services.includes(service)
        ? form.services.filter((item) => item !== service)
        : [...form.services, service],
    );
  };

  const validateStep = (index: number) => {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (form.fullName.trim().length < 2) next["fullName"] = "Full name is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        next["email"] = "Enter a valid business email address";
      if (!/^\+?[0-9\s().-]{6,40}$/.test(form.telephone.trim()))
        next["telephone"] = "Enter a valid international telephone number, e.g. +357 22 000000";
      if (form.country.trim().length < 2) next["country"] = "Country of residence is required";
    }
    if (index === 1) {
      if (form.businessActivity.trim().length < 3)
        next["businessActivity"] = "Describe the intended business activity";
      if (!form.timeframe) next["timeframe"] = "Select when you would like to establish the company";
      if (form.regulatedActivity === "yes" && form.regulatedActivityDetail.trim().length < 3)
        next["regulatedActivityDetail"] = "Briefly describe the regulated activity";
    }
    if (index === 2) {
      if (!form.consentPrivacy) next["consentPrivacy"] = "This consent is required";
      if (!form.consentSharing) next["consentSharing"] = "This authorisation is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      trackEvent("form_error", { form: "company_setup", step: step + 1 });
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    setServerError("");
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!validateStep(2)) return;

    setStatus("sending");
    try {
      const context = campaignContext();
      await submitCompanySetupEnquiry({
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim(),
          country: form.country.trim(),
          ...(form.nameOne.trim() ? { nameOne: form.nameOne.trim() } : {}),
          ...(form.nameTwo.trim() ? { nameTwo: form.nameTwo.trim() } : {}),
          ...(form.nameThree.trim() ? { nameThree: form.nameThree.trim() } : {}),
          businessActivity: form.businessActivity.trim(),
          ...(form.shareholderCount ? { shareholderCount: form.shareholderCount } : {}),
          ...(form.directorCount ? { directorCount: form.directorCount } : {}),
          ...(form.corporateShareholders
            ? { corporateShareholders: form.corporateShareholders }
            : {}),
          ...(form.regulatedActivity ? { regulatedActivity: form.regulatedActivity } : {}),
          ...(form.regulatedActivity === "yes" && form.regulatedActivityDetail.trim()
            ? { regulatedActivityDetail: form.regulatedActivityDetail.trim() }
            : {}),
          timeframe: form.timeframe,
          services: form.services,
          ...(form.additionalInformation.trim()
            ? { additionalInformation: form.additionalInformation.trim() }
            : {}),
          consentPrivacy: true as const,
          consentSharing: true as const,
          marketingOptIn: form.marketingOptIn,
          ...(form.website ? { website: form.website } : {}),
          ...(context.utm_source ? { utmSource: context.utm_source } : {}),
          ...(context.utm_medium ? { utmMedium: context.utm_medium } : {}),
          ...(context.utm_campaign ? { utmCampaign: context.utm_campaign } : {}),
          ...(context.landing_page ? { landingPage: context.landing_page } : {}),
          ...(context.referral_url ? { referralUrl: context.referral_url } : {}),
        },
      });
      setStatus("sent");
      trackEvent("form_submit", { form: "company_setup" });
    } catch (error) {
      setStatus("error");
      setServerError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
      trackEvent("form_error", { form: "company_setup", server: true });
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-panel" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-lg">
              Thank you — we have received your company-formation enquiry.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We will review the information provided and contact you regarding the next steps.
              Submitting this enquiry does not create a company, reserve a company name or constitute
              an application to the Cyprus Registrar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-panel sm:p-7">
      {/* progress */}
      <ol className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Enquiry progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                index <= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`text-xs font-medium sm:text-sm ${
                index === step ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-current={index === step ? "step" : undefined}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="cs-website">Website</label>
        <input
          id="cs-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => set("website", event.target.value)}
        />
      </div>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cs-name">Full name</Label>
            <Input
              id="cs-name"
              value={form.fullName}
              autoComplete="name"
              aria-invalid={Boolean(errors["fullName"])}
              aria-describedby={errors["fullName"] ? "cs-name-error" : undefined}
              onChange={(event) => set("fullName", event.target.value)}
            />
            <ErrorText id="cs-name-error" message={errors["fullName"]} />
          </div>
          <div>
            <Label htmlFor="cs-email">Business email</Label>
            <Input
              id="cs-email"
              type="email"
              value={form.email}
              autoComplete="email"
              aria-invalid={Boolean(errors["email"])}
              aria-describedby={errors["email"] ? "cs-email-error" : undefined}
              onChange={(event) => set("email", event.target.value)}
            />
            <ErrorText id="cs-email-error" message={errors["email"]} />
          </div>
          <div>
            <Label htmlFor="cs-tel">Telephone / WhatsApp</Label>
            <Input
              id="cs-tel"
              type="tel"
              placeholder="+357 22 000000"
              value={form.telephone}
              autoComplete="tel"
              aria-invalid={Boolean(errors["telephone"])}
              aria-describedby={errors["telephone"] ? "cs-tel-error" : undefined}
              onChange={(event) => set("telephone", event.target.value)}
            />
            <ErrorText id="cs-tel-error" message={errors["telephone"]} />
          </div>
          <div>
            <Label htmlFor="cs-country">Country of residence</Label>
            <Input
              id="cs-country"
              value={form.country}
              autoComplete="country-name"
              aria-invalid={Boolean(errors["country"])}
              aria-describedby={errors["country"] ? "cs-country-error" : undefined}
              onChange={(event) => set("country", event.target.value)}
            />
            <ErrorText id="cs-country-error" message={errors["country"]} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cs-n1">First proposed company name</Label>
            <Input id="cs-n1" value={form.nameOne} onChange={(e) => set("nameOne", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cs-n2">Second proposed company name</Label>
            <Input id="cs-n2" value={form.nameTwo} onChange={(e) => set("nameTwo", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cs-n3">Third proposed company name</Label>
            <Input
              id="cs-n3"
              value={form.nameThree}
              onChange={(e) => set("nameThree", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cs-timeframe">When would you like to establish the company?</Label>
            <select
              id="cs-timeframe"
              className={fieldClass}
              value={form.timeframe}
              aria-invalid={Boolean(errors["timeframe"])}
              aria-describedby={errors["timeframe"] ? "cs-timeframe-error" : undefined}
              onChange={(event) => set("timeframe", event.target.value)}
            >
              <option value="">Please select</option>
              {SETUP_TIMEFRAME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ErrorText id="cs-timeframe-error" message={errors["timeframe"]} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cs-activity">Intended business activity</Label>
            <Textarea
              id="cs-activity"
              rows={4}
              className="mt-1.5"
              value={form.businessActivity}
              aria-invalid={Boolean(errors["businessActivity"])}
              aria-describedby={errors["businessActivity"] ? "cs-activity-error" : undefined}
              onChange={(event) => set("businessActivity", event.target.value)}
            />
            <ErrorText id="cs-activity-error" message={errors["businessActivity"]} />
          </div>
          <div>
            <Label htmlFor="cs-shareholders">Number of shareholders</Label>
            <select
              id="cs-shareholders"
              className={fieldClass}
              value={form.shareholderCount}
              onChange={(event) => set("shareholderCount", event.target.value)}
            >
              <option value="">Please select</option>
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cs-directors">Number of directors</Label>
            <select
              id="cs-directors"
              className={fieldClass}
              value={form.directorCount}
              onChange={(event) => set("directorCount", event.target.value)}
            >
              <option value="">Please select</option>
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cs-corporate">
              Are any shareholders companies, partnerships or trusts?
            </Label>
            <select
              id="cs-corporate"
              className={fieldClass}
              value={form.corporateShareholders}
              onChange={(event) => set("corporateShareholders", event.target.value)}
            >
              <option value="">Please select</option>
              {YES_NO_UNSURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cs-regulated">Will the company conduct a regulated activity?</Label>
            <select
              id="cs-regulated"
              className={fieldClass}
              value={form.regulatedActivity}
              onChange={(event) => set("regulatedActivity", event.target.value)}
            >
              <option value="">Please select</option>
              {YES_NO_UNSURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {form.regulatedActivity === "yes" && (
            <div className="sm:col-span-2">
              <Label htmlFor="cs-regulated-detail">
                Please briefly describe the regulated activity.
              </Label>
              <Textarea
                id="cs-regulated-detail"
                rows={3}
                className="mt-1.5"
                value={form.regulatedActivityDetail}
                aria-invalid={Boolean(errors["regulatedActivityDetail"])}
                aria-describedby={
                  errors["regulatedActivityDetail"] ? "cs-regulated-detail-error" : undefined
                }
                onChange={(event) => set("regulatedActivityDetail", event.target.value)}
              />
              <ErrorText
                id="cs-regulated-detail-error"
                message={errors["regulatedActivityDetail"]}
              />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium">Services required (select all that apply)</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SETUP_SERVICE_OPTIONS.map((service) => (
                <label
                  key={service}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={form.services.includes(service)}
                    onChange={() => toggleService(service)}
                  />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="cs-extra">Additional information (optional)</Label>
            <Textarea
              id="cs-extra"
              rows={4}
              className="mt-1.5"
              value={form.additionalInformation}
              onChange={(event) => set("additionalInformation", event.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.consentPrivacy}
                aria-invalid={Boolean(errors["consentPrivacy"])}
                onChange={(event) => set("consentPrivacy", event.target.checked)}
              />
              <span>
                I have read the{" "}
                <Link to="/privacy" className="underline underline-offset-2">
                  Privacy Policy
                </Link>{" "}
                and agree that Infocredit Group Ltd may process my information to review and respond
                to this enquiry.
              </span>
            </label>
            <ErrorText id="cs-consent-privacy-error" message={errors["consentPrivacy"]} />

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.consentSharing}
                aria-invalid={Boolean(errors["consentSharing"])}
                onChange={(event) => set("consentSharing", event.target.checked)}
              />
              <span>{CONSENT_TEXT_SHARING}</span>
            </label>
            <ErrorText id="cs-consent-sharing-error" message={errors["consentSharing"]} />

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.marketingOptIn}
                onChange={(event) => set("marketingOptIn", event.target.checked)}
              />
              <span>{CONSENT_TEXT_MARKETING}</span>
            </label>
          </div>
        </div>
      )}

      {status === "error" && serverError && (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>We could not send your enquiry</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep((prev) => prev - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button type="submit" disabled={status === "sending"} aria-busy={status === "sending"}>
            {status === "sending" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {status === "sending" ? "Sending…" : "Request a Specialist Introduction"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </form>
  );
}
