import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ambulance, ArrowLeft, ArrowRight, Activity, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { saveProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/register/ambulance")({
  head: () => ({
    meta: [{ title: "Ambulance Registration · AEGIS" }],
  }),
  component: AmbulanceRegister,
});

const ambulanceSchema = z
  .object({
    operatorName: z.string().min(2, "Operator Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),
    organizationName: z.string().min(2, "Organization Name is required"),
    ambulanceNumber: z.string().min(6, "Ambulance number must be valid (e.g. DL-1Y-A-1083)"),
    vehicleType: z.string().min(1, "Select vehicle service type"),
    driverName: z.string().min(2, "Driver Name must be at least 2 characters"),
    driverLicenseNumber: z.string().min(5, "Driver License Number is required"),
    gpsDeviceId: z.string().min(4, "GPS Tracker Hardware ID is required"),
    serviceArea: z.string().min(2, "Operating Service Area is required"),
    vehicleRegUpload: z
      .any()
      .refine(
        (val) => val !== null && val !== undefined && val !== "",
        "Vehicle registration document is required",
      ),
    driverLicenseUpload: z
      .any()
      .refine(
        (val) => val !== null && val !== undefined && val !== "",
        "Driver license document is required",
      ),
    consent: z
      .boolean()
      .refine((val) => val === true, "You must consent to sharing GPS tracking telemetry"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AmbulanceFormData = z.infer<typeof ambulanceSchema>;

/** Dedicated, bulletproof File Upload component for Ambulance Step 3 */
function AmbulanceFileUpload({
  label,
  value,
  onChange,
}: {
  label: string;
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
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/30 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
              📄
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate max-w-[130px] sm:max-w-[170px]">
                {fileName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-amber-700 font-bold">✓ Document selected</span>
                {fileSize && <span className="text-[10px] text-gray-400">({fileSize})</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2 py-0.5 text-[10px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md bg-white transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                onChange(null);
              }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 rounded-md bg-white transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center cursor-pointer transition-all hover:bg-gray-50/50 hover:border-gray-300"
        >
          <div className="mx-auto h-9 w-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-1.5">
            📁
          </div>
          <p className="text-xs font-bold text-gray-700">
            Click to <span className="text-amber-600 underline">Upload Document</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">PDF, PNG, JPG (max 5MB)</p>
        </button>
      )}
    </div>
  );
}

function AmbulanceRegister() {
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
  } = useForm<AmbulanceFormData>({
    resolver: zodResolver(ambulanceSchema),
    mode: "onChange",
    defaultValues: {
      operatorName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      organizationName: "",
      ambulanceNumber: "",
      vehicleType: "",
      driverName: "",
      driverLicenseNumber: "",
      gpsDeviceId: "",
      serviceArea: "",
      vehicleRegUpload: null,
      driverLicenseUpload: null,
      consent: false,
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof AmbulanceFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ["operatorName", "email", "mobileNumber", "password", "confirmPassword"];
    } else if (step === 2) {
      fieldsToValidate = [
        "organizationName",
        "ambulanceNumber",
        "vehicleType",
        "driverName",
        "driverLicenseNumber",
        "gpsDeviceId",
        "serviceArea",
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

  const onSubmit = async (data: AmbulanceFormData) => {
    setLoading(true);
    try {
      const vehicleRegName =
        data.vehicleRegUpload instanceof File
          ? data.vehicleRegUpload.name
          : typeof data.vehicleRegUpload === "string"
            ? data.vehicleRegUpload
            : "mock_reg.pdf";

      const driverLicenseName =
        data.driverLicenseUpload instanceof File
          ? data.driverLicenseUpload.name
          : typeof data.driverLicenseUpload === "string"
            ? data.driverLicenseUpload
            : "mock_dl.pdf";

      const payload = {
        operatorName: data.operatorName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        organizationName: data.organizationName,
        ambulanceNumber: data.ambulanceNumber,
        vehicleType: data.vehicleType,
        driverName: data.driverName,
        driverLicenseNumber: data.driverLicenseNumber,
        gpsDeviceId: data.gpsDeviceId,
        serviceArea: data.serviceArea,
        consent: data.consent,
        vehicleRegUpload: vehicleRegName,
        driverLicenseUpload: driverLicenseName,
        vehicleRegUploadName: vehicleRegName,
        driverLicenseUploadName: driverLicenseName,
      };

      await registerUser("ambulance", payload);
      saveProfile("ambulance", payload);

      setSuccess(true);
      toast.success("Ambulance Registration Completed!");
      setTimeout(() => {
        navigate({ to: "/ambulance" });
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
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Roles
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-600 text-white">
              <Ambulance className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-xs text-gray-900">AEGIS FLEET</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Vehicle Registered</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configuring green corridor links and pairing telemetry systems...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 animate-pulse rounded-full"
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
                  <h1 className="text-xl font-extrabold text-gray-900">Ambulance Registration</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        step === s ? "w-6 bg-amber-600" : "w-2 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: Account setup */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Operator Name
                    </label>
                    <input
                      type="text"
                      {...register("operatorName")}
                      placeholder="Vivaan Sharma"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 focus:outline-none transition-all"
                    />
                    {errors.operatorName?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.operatorName.message)}
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
                      placeholder="operator@metrodispatch.in"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 focus:outline-none transition-all"
                    />
                    {errors.email?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.email.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Emergency Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        {...register("mobileNumber")}
                        placeholder="9876543216"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 focus:outline-none transition-all"
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
                        placeholder="••••••••"
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
                      <PasswordInput {...register("confirmPassword")} placeholder="••••••••" />
                      {errors.confirmPassword?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.confirmPassword.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Ambulance & Driver Profile */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Organization / Fleet Name
                      </label>
                      <input
                        type="text"
                        {...register("organizationName")}
                        placeholder="Noida EMS Services"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                      />
                      {errors.organizationName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.organizationName.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Ambulance Plate Number
                      </label>
                      <input
                        type="text"
                        {...register("ambulanceNumber")}
                        placeholder="UP-16-AM-1083"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                      />
                      {errors.ambulanceNumber?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.ambulanceNumber.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Emergency Support Level
                      </label>
                      <select
                        {...register("vehicleType")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select Level</option>
                        <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                        <option value="Advanced Life Support (ALS)">
                          Advanced Life Support (ALS)
                        </option>
                        <option value="ICU Ambulance">ICU Ambulance</option>
                      </select>
                      {errors.vehicleType?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.vehicleType.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        GPS Hardware ID
                      </label>
                      <input
                        type="text"
                        {...register("gpsDeviceId")}
                        placeholder="GPS-A1083-XP"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                      />
                      {errors.gpsDeviceId?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.gpsDeviceId.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Primary Driver Name
                      </label>
                      <input
                        type="text"
                        {...register("driverName")}
                        placeholder="Vivaan Sharma"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                      />
                      {errors.driverName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.driverName.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Driver License Number
                      </label>
                      <input
                        type="text"
                        {...register("driverLicenseNumber")}
                        placeholder="DL-142025008239"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                      />
                      {errors.driverLicenseNumber?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.driverLicenseNumber.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Assigned Service Area (City / Sectors)
                    </label>
                    <input
                      type="text"
                      {...register("serviceArea")}
                      placeholder="Noida Sectors 50, 62, 63 & Indirapuram Grid"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                    />
                    {errors.serviceArea?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.serviceArea.message)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Document Uploads & Clearances */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      name="vehicleRegUpload"
                      control={control}
                      render={({ field }) => (
                        <AmbulanceFileUpload
                          label="Vehicle Registration (RC)"
                          value={field.value}
                          onChange={(file) => field.onChange(file)}
                        />
                      )}
                    />

                    <Controller
                      name="driverLicenseUpload"
                      control={control}
                      render={({ field }) => (
                        <AmbulanceFileUpload
                          label="Driver's License (Front/Back)"
                          value={field.value}
                          onChange={(file) => field.onChange(file)}
                        />
                      )}
                    />
                  </div>
                  {errors.vehicleRegUpload?.message && (
                    <p className="text-[10px] text-red-500 font-bold">
                      ⚠️ {String(errors.vehicleRegUpload.message)}
                    </p>
                  )}
                  {errors.driverLicenseUpload?.message && (
                    <p className="text-[10px] text-red-500 font-bold">
                      ⚠️ {String(errors.driverLicenseUpload.message)}
                    </p>
                  )}

                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("consent")}
                        className="rounded mt-1 text-amber-600 focus:ring-amber-600 h-4 w-4"
                      />
                      <span className="text-[10px] leading-relaxed text-gray-500 font-semibold uppercase tracking-wide">
                        I hereby authorize AEGIS Metro Command to capture and stream live GPS
                        positioning coordinate logs from my paired onboard tracker during mission
                        active dispatch cycles.
                      </span>
                    </label>
                    {errors.consent?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.consent.message)}
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
                    Previous
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98]"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Saving Registration...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish &amp; Register</span>
                        <CheckCircle2 className="h-4 w-4" />
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
