import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TrafficCone, ArrowLeft, Activity, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { saveProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/register/traffic")({
  head: () => ({
    meta: [{ title: "Traffic Management Registration · AEGIS" }],
  }),
  component: TrafficRegister,
});

const trafficSchema = z
  .object({
    // STEP 1 — PERSONAL DETAILS
    fullName: z.string().min(2, "Full Name must be at least 2 characters"),
    email: z.string().email("Invalid official email address"),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),

    // STEP 2 — OFFICIAL / DEPARTMENT DETAILS
    officerId: z.string().min(2, "Employee / Officer ID is required"),
    designation: z.string().min(1, "Please select designation"),
    trafficUnit: z.string().min(2, "Traffic Unit is required"),
    controlCenter: z.string().min(2, "Police Station / Control Center is required"),
    zone: z.string().min(1, "Please select assigned zone/sector"),
    city: z.string().min(2, "City is required"),
    dutyShift: z.string().min(1, "Please select duty shift"),

    // STEP 3 — VERIFICATION & SECURITY
    badgeId: z.string().min(2, "Badge / Officer ID is required"),
    idUpload: z
      .any()
      .refine(
        (val) => val !== null && val !== undefined && val !== "",
        "Official Identification document is required",
      ),
    emergencyContact: z
      .string()
      .regex(/^[0-9]{10}$/, "Emergency contact number must be exactly 10 digits"),
    authorizedConsent: z.boolean().refine((val) => val === true, "You must confirm authorization"),
    policyConsent: z.boolean().refine((val) => val === true, "You must agree to AEGIS policies"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type TrafficFormData = z.infer<typeof trafficSchema>;

const DESIGNATION_OPTIONS = [
  "Traffic Police Officer",
  "Traffic Inspector",
  "Sub-Inspector",
  "Assistant Sub-Inspector",
  "Constable",
  "Traffic Control Operator",
];

const SHIFT_OPTIONS = ["Morning", "Evening", "Night", "Rotational"];

const ZONE_OPTIONS = [
  "Sector 62 / NH-24",
  "Sector 18 Commercial Hub",
  "Sector 63 Industrial Area",
  "Expressway Zone 1",
  "Central Traffic Circle",
  "Outer Ring Corridor",
];

/** Dedicated, bulletproof frontend File Upload component for Step 3 */
function TrafficFileUpload({
  label = "Official Identification",
  value,
  onChange,
}: {
  label?: string;
  value?: File | string | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const fileName = value instanceof File ? value.name : typeof value === "string" ? value : null;
  const fileSize = value instanceof File ? `${(value.size / 1024).toFixed(1)} KB` : null;

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onChange(e.target.files[0]);
          }
        }}
      />
      {fileName ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50/30 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
              📄
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate max-w-[180px] sm:max-w-[240px]">
                {fileName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-green-600 font-bold">✓ Document selected</span>
                {fileSize && <span className="text-[10px] text-gray-400">({fileSize})</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg bg-white transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                onChange(null);
              }}
              className="px-2 py-1 text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 rounded-lg bg-white transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center cursor-pointer transition-all hover:bg-gray-50/50 hover:border-gray-300"
        >
          <div className="mx-auto h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-2">
            📁
          </div>
          <p className="text-xs font-bold text-gray-700">
            Click to <span className="text-[#E63946] underline">Upload Identification</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">PDF, PNG, JPG (max 5MB)</p>
        </button>
      )}
    </div>
  );
}

function TrafficRegister() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<TrafficFormData>({
    resolver: zodResolver(trafficSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      officerId: "",
      designation: "",
      trafficUnit: "",
      controlCenter: "",
      zone: "",
      city: "",
      dutyShift: "",
      badgeId: "",
      idUpload: null,
      emergencyContact: "",
      authorizedConsent: false,
      policyConsent: false,
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof TrafficFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ["fullName", "email", "mobileNumber", "password", "confirmPassword"];
    } else if (step === 2) {
      fieldsToValidate = [
        "officerId",
        "designation",
        "trafficUnit",
        "controlCenter",
        "zone",
        "city",
        "dutyShift",
      ];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const onSubmit = async (data: TrafficFormData) => {
    setLoading(true);
    try {
      const fileName = data.idUpload instanceof File ? data.idUpload.name : "Official_ID.pdf";
      const payload = {
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        officerId: data.officerId,
        employeeId: data.officerId,
        designation: data.designation,
        trafficUnit: data.trafficUnit,
        controlCenter: data.controlCenter,
        zone: data.zone,
        city: data.city,
        dutyShift: data.dutyShift,
        badgeId: data.badgeId,
        emergencyContact: data.emergencyContact,
        authorizedConsent: data.authorizedConsent,
        policyConsent: data.policyConsent,
        idUploadName: fileName,
      };

      await registerUser("traffic", payload);
      saveProfile("traffic", payload);

      setSuccess(true);
      toast.success("Traffic Management Account Created!");
      setTimeout(() => {
        navigate({ to: "/traffic" });
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onInvalidSubmit = (errs: any) => {
    if (errs && typeof errs === "object") {
      const errorKeys = Object.keys(errs);
      if (errorKeys.length > 0) {
        const firstKey = errorKeys[0];
        const error = errs[firstKey];
        toast.error(`Validation Error: ${error?.message || "Please check your inputs."}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8F9FB] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-500/[0.02] to-transparent pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Top Header */}
        <div className="flex justify-between items-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Roles
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-white">
              <TrafficCone className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-xs text-gray-900">AEGIS TRAFFIC</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Account Created</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Connecting profile to AEGIS Traffic Operations Grid...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E63946] animate-pulse rounded-full"
                    style={{ width: "90%" }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
              {/* Stepper Header */}
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900">
                    {step === 1 && "Traffic Management Registration"}
                    {step === 2 && "Official Details"}
                    {step === 3 && "Verification & Security"}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        step === s ? "w-6 bg-[#E63946]" : "w-2 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      {...register("fullName")}
                      placeholder="Enter full name"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                    />
                    {errors.fullName?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.fullName.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="Enter official email"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                    />
                    {errors.email?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.email.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        {...register("mobileNumber")}
                        placeholder="Enter mobile number"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                      />
                    </div>
                    {errors.mobileNumber?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.mobileNumber.message)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <PasswordInput
                        showStrength
                        {...register("password")}
                        placeholder="Enter password"
                      />
                      {errors.password?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.password.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Confirm Password
                      </label>
                      <PasswordInput
                        {...register("confirmPassword")}
                        placeholder="Confirm password"
                      />
                      {errors.confirmPassword?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.confirmPassword.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Official Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Employee / Officer ID
                      </label>
                      <input
                        type="text"
                        {...register("officerId")}
                        placeholder="Enter employee/officer ID"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                      />
                      {errors.officerId?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.officerId.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Designation
                      </label>
                      <select
                        {...register("designation")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select designation ▼</option>
                        {DESIGNATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {errors.designation?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.designation.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Traffic Unit
                    </label>
                    <input
                      type="text"
                      {...register("trafficUnit")}
                      placeholder="Enter/select traffic unit"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                    />
                    {errors.trafficUnit?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.trafficUnit.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Police Station / Control Center
                    </label>
                    <input
                      type="text"
                      {...register("controlCenter")}
                      placeholder="Enter/select control center"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                    />
                    {errors.controlCenter?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.controlCenter.message)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Assigned Zone / Sector
                      </label>
                      <select
                        {...register("zone")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select zone/sector ▼</option>
                        {ZONE_OPTIONS.map((zOpt) => (
                          <option key={zOpt} value={zOpt}>
                            {zOpt}
                          </option>
                        ))}
                      </select>
                      {errors.zone?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.zone.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        {...register("city")}
                        placeholder="Enter/select city"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                      />
                      {errors.city?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.city.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Duty Shift
                    </label>
                    <select
                      {...register("dutyShift")}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all bg-white"
                    >
                      <option value="">Select shift ▼</option>
                      {SHIFT_OPTIONS.map((sOpt) => (
                        <option key={sOpt} value={sOpt}>
                          {sOpt}
                        </option>
                      ))}
                    </select>
                    {errors.dutyShift?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.dutyShift.message)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Verification & Security */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Badge / Officer ID
                    </label>
                    <input
                      type="text"
                      {...register("badgeId")}
                      placeholder="Enter badge/officer ID"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                    />
                    {errors.badgeId?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.badgeId.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Controller
                      name="idUpload"
                      control={control}
                      render={({ field }) => (
                        <TrafficFileUpload
                          label="Official Identification"
                          value={field.value}
                          onChange={(file) => field.onChange(file)}
                        />
                      )}
                    />
                    {errors.idUpload?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.idUpload.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Emergency Contact
                    </label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        {...register("emergencyContact")}
                        placeholder="Emergency contact number"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/10 focus:outline-none transition-all"
                      />
                    </div>
                    {errors.emergencyContact?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.emergencyContact.message)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("authorizedConsent")}
                        className="rounded mt-0.5 text-[#E63946] focus:ring-[#E63946] h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I confirm that I am authorized Traffic Management personnel.
                      </span>
                    </label>
                    {errors.authorizedConsent?.message && (
                      <p className="text-[10px] text-red-500 font-bold">
                        ⚠️ {String(errors.authorizedConsent.message)}
                      </p>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("policyConsent")}
                        className="rounded mt-0.5 text-[#E63946] focus:ring-[#E63946] h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I agree to AEGIS emergency response policies.
                      </span>
                    </label>
                    {errors.policyConsent?.message && (
                      <p className="text-[10px] text-red-500 font-bold">
                        ⚠️ {String(errors.policyConsent.message)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-50">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 py-3 text-sm font-bold text-gray-700 transition-all active:scale-[0.98]"
                  >
                    ← Back
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98]"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Traffic Account →</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
