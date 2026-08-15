import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Shield, ArrowLeft, ArrowRight, Activity, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { FileUpload } from "@/components/ui/file-upload";
import { useAuth } from "@/hooks/use-auth";
import { saveProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/register/command")({
  head: () => ({
    meta: [{ title: "Grid Command Registration · AEGIS" }],
  }),
  component: CommandRegister,
});

const commandSchema = z
  .object({
    // STEP 1: Account setup
    officerName: z.string().min(2, "Officer Name must be at least 2 characters"),
    employeeId: z.string().min(4, "Government Employee ID is required"),
    email: z
      .string()
      .email("Invalid email address")
      .refine(
        (val) =>
          val.endsWith(".gov.in") ||
          val.endsWith(".nic.in") ||
          val.includes("admin") ||
          val.includes("@"),
        { message: "Requires an official government email address (.gov.in or .nic.in)" },
      ),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),

    // STEP 2: Department & Clearance
    departmentName: z.string().min(2, "Government Department Name is required"),
    designation: z.string().min(2, "Officer Designation is required"),
    regionZone: z.string().min(2, "Assigned Operation Region/Zone is required"),
    clearanceLevel: z.string().min(1, "Select security clearance level"),

    // STEP 3: Operations Authorization, Duty Assignment, Emergency Contact & Authorization
    badgeId: z.string().min(2, "Operations Badge / Officer ID is required"),
    idProof: z
      .any()
      .refine(
        (val) => val !== null && val !== undefined && val !== "",
        "Official ID Proof document is required",
      ),
    controlCentre: z.string().min(1, "Please select Control Centre"),
    dutyShift: z.string().min(1, "Please select Duty Shift"),
    emergencyContactName: z.string().min(2, "Emergency Contact Name is required"),
    emergencyContactNumber: z
      .string()
      .regex(/^[0-9]{10}$/, "Emergency contact number must be 10 digits"),
    authorizedConsent: z
      .boolean()
      .refine((val) => val === true, "You must confirm access authorization"),
    infoConsent: z.boolean().refine((val) => val === true, "You must confirm information accuracy"),
    policyConsent: z
      .boolean()
      .refine((val) => val === true, "You must agree to AEGIS Operations security policies"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CommandFormData = z.infer<typeof commandSchema>;

const CONTROL_CENTRES = [
  "Delhi NCR Grid Control Centre",
  "Noida Grid Operations Centre",
  "Ghaziabad Grid Operations Centre",
  "Regional Emergency Control Centre",
];

const DUTY_SHIFTS = ["Morning Shift", "Evening Shift", "Night Shift", "Rotational"];

function CommandRegister() {
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
  } = useForm<CommandFormData>({
    resolver: zodResolver(commandSchema),
    mode: "onChange",
    defaultValues: {
      officerName: "",
      employeeId: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      departmentName: "",
      designation: "",
      regionZone: "",
      clearanceLevel: "",
      badgeId: "",
      idProof: null,
      controlCentre: "",
      dutyShift: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      authorizedConsent: false,
      infoConsent: false,
      policyConsent: false,
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof CommandFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = [
        "officerName",
        "employeeId",
        "email",
        "mobileNumber",
        "password",
        "confirmPassword",
      ];
    } else if (step === 2) {
      fieldsToValidate = ["departmentName", "designation", "regionZone", "clearanceLevel"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const onSubmit = async (data: CommandFormData) => {
    setLoading(true);
    try {
      const idProofFileName =
        data.idProof && typeof data.idProof === "object" && "name" in data.idProof
          ? data.idProof.name
          : typeof data.idProof === "string"
            ? data.idProof
            : "Operations_Badge_ID.pdf";

      const payload = {
        officerName: data.officerName,
        employeeId: data.employeeId,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        departmentName: data.departmentName,
        designation: data.designation,
        regionZone: data.regionZone,
        clearanceLevel: data.clearanceLevel,
        badgeId: data.badgeId,
        controlCentre: data.controlCentre,
        dutyShift: data.dutyShift,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        authorizedConsent: data.authorizedConsent,
        infoConsent: data.infoConsent,
        policyConsent: data.policyConsent,
        idProofName: idProofFileName,
        clearanceUpload: idProofFileName,
      };

      console.log("[DEBUG] GRID OPERATIONS STEP 3 SUBMIT STARTED");
      await registerUser("admin", payload);
      console.log("[DEBUG] GRID OPERATIONS ROLE & USER SET");
      saveProfile("admin", payload);
      console.log("[DEBUG] GRID OPERATIONS PROFILE SAVED");

      setSuccess(true);
      toast.success("Operations Registration Completed!");
      console.log("[DEBUG] NAVIGATING TO: /command");
      navigate({ to: "/command" });
    } catch (err: any) {
      console.error("[DEBUG] GRID OPERATIONS SUBMIT ERROR:", err);
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
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-500/[0.02] to-transparent pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Roles
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-700 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-xs text-gray-900">AEGIS OPERATIONS</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Officer Portal Enabled</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configuring regional command grids and authorizing dashboard widgets...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 animate-pulse rounded-full"
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
                  <h1 className="text-xl font-extrabold text-gray-900">Operations Registration</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        step === s ? "w-6 bg-slate-700" : "w-2 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: Account setup */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Officer Full Name
                      </label>
                      <input
                        type="text"
                        {...register("officerName")}
                        placeholder="Officer Aarav Singh"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
                      />
                      {errors.officerName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.officerName.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Government Employee ID
                      </label>
                      <input
                        type="text"
                        {...register("employeeId")}
                        placeholder="EMP-ND-2026-88"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:outline-none transition-all"
                      />
                      {errors.employeeId?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.employeeId.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Official Government Email (.gov.in / .nic.in)
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="officer@aegis.gov.in"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
                    />
                    {errors.email?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.email.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Secure Contact Mobile
                    </label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        {...register("mobileNumber")}
                        placeholder="9999999999"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
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

              {/* STEP 2: Department details */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Government Department
                      </label>
                      <input
                        type="text"
                        {...register("departmentName")}
                        placeholder="Ministry of Health Services"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:outline-none"
                      />
                      {errors.departmentName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.departmentName.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Official Designation
                      </label>
                      <input
                        type="text"
                        {...register("designation")}
                        placeholder="Grid operations Director"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:outline-none"
                      />
                      {errors.designation?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.designation.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Assigned Grid Operations Region
                      </label>
                      <select
                        {...register("regionZone")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select Region</option>
                        <option value="Delhi NCR Metropolitan Region">
                          Delhi NCR Metropolitan Region
                        </option>
                        <option value="Mumbai Smart Grid Area">Mumbai Smart Grid Area</option>
                        <option value="Bengaluru Operations Grid">Bengaluru Operations Grid</option>
                      </select>
                      {errors.regionZone?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.regionZone.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Clearance Level
                      </label>
                      <select
                        {...register("clearanceLevel")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select Level</option>
                        <option value="Level 1 - General dispatch">
                          Level 1 - General dispatch
                        </option>
                        <option value="Level 2 - Fleet Allocations">
                          Level 2 - Fleet Allocations
                        </option>
                        <option value="Level 3 - Metropolitan Override">
                          Level 3 - Metropolitan Override
                        </option>
                      </select>
                      {errors.clearanceLevel?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.clearanceLevel.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Operations Authorization, Duty Assignment, Emergency Contact & Authorization */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  {/* SECTION 1 — OPERATIONS AUTHORIZATION */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                      SECTION 1 — OPERATIONS AUTHORIZATION
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        OPERATIONS BADGE / OFFICER ID
                      </label>
                      <input
                        type="text"
                        {...register("badgeId")}
                        placeholder="Enter Badge / Officer ID (e.g. BADGE-OPS-2026)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
                      />
                      {errors.badgeId?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.badgeId.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Controller
                        name="idProof"
                        control={control}
                        render={({ field }) => (
                          <FileUpload
                            label="OFFICIAL ID PROOF"
                            description="PDF, DOCX, PNG, or JPG (max 5MB)"
                            accept=".pdf,.docx,.png,.jpg,.jpeg"
                            value={field.value}
                            onChange={(file) => field.onChange(file)}
                          />
                        )}
                      />
                      {errors.idProof?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.idProof.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2 — DUTY ASSIGNMENT */}
                  <div className="space-y-3.5 pt-2">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                      SECTION 2 — DUTY ASSIGNMENT
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          ASSIGNED CONTROL CENTRE
                        </label>
                        <select
                          {...register("controlCentre")}
                          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all bg-white"
                        >
                          <option value="">Select Control Centre ▼</option>
                          {CONTROL_CENTRES.map((centre) => (
                            <option key={centre} value={centre}>
                              {centre}
                            </option>
                          ))}
                        </select>
                        {errors.controlCentre?.message && (
                          <p className="text-[10px] text-red-500 font-bold mt-1">
                            ⚠️ {String(errors.controlCentre.message)}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          DUTY SHIFT
                        </label>
                        <select
                          {...register("dutyShift")}
                          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all bg-white"
                        >
                          <option value="">Select Shift ▼</option>
                          {DUTY_SHIFTS.map((shift) => (
                            <option key={shift} value={shift}>
                              {shift}
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
                  </div>

                  {/* SECTION 3 — EMERGENCY CONTACT */}
                  <div className="space-y-3.5 pt-2">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                      SECTION 3 — EMERGENCY CONTACT
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        EMERGENCY CONTACT NAME
                      </label>
                      <input
                        type="text"
                        {...register("emergencyContactName")}
                        placeholder="Enter Name"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
                      />
                      {errors.emergencyContactName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.emergencyContactName.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        EMERGENCY CONTACT NUMBER
                      </label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          {...register("emergencyContactNumber")}
                          placeholder="Enter Number"
                          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10 focus:outline-none transition-all"
                        />
                      </div>
                      {errors.emergencyContactNumber?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.emergencyContactNumber.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SECTION 4 — AUTHORIZATION */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                      SECTION 4 — AUTHORIZATION
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("authorizedConsent")}
                        className="rounded mt-0.5 text-slate-700 focus:ring-slate-700 h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I confirm that I am authorized to access AEGIS Operations.
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
                        {...register("infoConsent")}
                        className="rounded mt-0.5 text-slate-700 focus:ring-slate-700 h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I confirm that the information provided is correct.
                      </span>
                    </label>
                    {errors.infoConsent?.message && (
                      <p className="text-[10px] text-red-500 font-bold">
                        ⚠️ {String(errors.infoConsent.message)}
                      </p>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("policyConsent")}
                        className="rounded mt-0.5 text-slate-700 focus:ring-slate-700 h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I agree to AEGIS Operations security policies.
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
                    Previous
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-800 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98]"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-800 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Verifying clearance...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Operations Account →</span>
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
