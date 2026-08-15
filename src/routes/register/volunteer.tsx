import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Users, ArrowLeft, ArrowRight, Activity, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { saveProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/register/volunteer")({
  head: () => ({
    meta: [{ title: "Volunteer Registration · AEGIS" }],
  }),
  component: VolunteerRegister,
});

const volunteerSchema = z
  .object({
    // STEP 1: Account setup
    fullName: z.string().min(2, "Full Name must be at least 2 characters"),
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

    // STEP 2: Location, Radius & Skills
    dob: z.string().min(1, "Date of Birth is required"),
    city: z.string().min(2, "City must be at least 2 characters"),
    state: z.string().min(2, "State is required"),
    availabilityRadius: z.string().min(1, "Select availability radius"),
    skills: z.array(z.string()).min(1, "Select at least one emergency response skill"),
    bloodGroup: z.string().min(1, "Please select your blood group"),

    // STEP 3: Verification, Emergency Contact, Readiness & Consent
    idNumber: z.string().min(2, "Government / Volunteer ID Number is required"),
    idProof: z
      .any()
      .refine(
        (val) => val !== null && val !== undefined && val !== "",
        "ID Proof document is required",
      ),
    emergencyContactName: z.string().min(2, "Emergency Contact Name is required"),
    emergencyContactNumber: z
      .string()
      .regex(/^[0-9]{10}$/, "Emergency contact number must be 10 digits"),
    relationship: z.string().min(1, "Please select relationship"),
    preferredResponseTypes: z
      .array(z.string())
      .min(1, "Select at least one preferred response type"),
    emergencyDispatchAvailable: z.string().min(1, "Please select emergency dispatch availability"),
    infoConsent: z.boolean().refine((val) => val === true, "You must confirm information accuracy"),
    policyConsent: z
      .boolean()
      .refine((val) => val === true, "You must agree to AEGIS volunteer response policies"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type VolunteerFormData = z.infer<typeof volunteerSchema>;

const AVAILABLE_SKILLS = [
  "CPR Certified",
  "First Aid Certified",
  "Fire Safety Training",
  "Disaster Response Training",
  "Registered Nurse (RN)",
  "Medical Practitioner (Doctor)",
  "Medical Student",
  "AED Trained",
];

const RESPONSE_TYPES = [
  "Medical Emergency",
  "Road Accident",
  "Fire",
  "Disaster",
  "General Emergency",
];

const RELATIONSHIP_OPTIONS = ["Parent", "Spouse", "Sibling", "Guardian", "Other"];

/** Dedicated, bulletproof File Upload component for Volunteer Step 3 */
function VolunteerFileUpload({
  label = "Upload ID Proof",
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
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/30 p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
              📄
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate max-w-[150px] sm:max-w-[210px]">
                {fileName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-purple-700 font-bold">✓ Document selected</span>
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
          className="w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center cursor-pointer transition-all hover:bg-gray-50/50 hover:border-gray-300"
        >
          <div className="mx-auto h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-1.5">
            📁
          </div>
          <p className="text-xs font-bold text-gray-700">
            Click to <span className="text-purple-600 underline">Upload ID Proof</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">PDF, PNG, JPG (max 5MB)</p>
        </button>
      )}
    </div>
  );
}

function VolunteerRegister() {
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      dob: "",
      city: "",
      state: "",
      availabilityRadius: "",
      skills: [],
      bloodGroup: "",
      idNumber: "",
      idProof: null,
      emergencyContactName: "",
      emergencyContactNumber: "",
      relationship: "",
      preferredResponseTypes: [],
      emergencyDispatchAvailable: "Yes",
      infoConsent: false,
      policyConsent: false,
    },
  });

  const selectedSkills = watch("skills") || [];
  const selectedResponseTypes = watch("preferredResponseTypes") || [];
  const selectedDispatchAvailable = watch("emergencyDispatchAvailable") || "Yes";

  const handleSkillToggle = (skill: string) => {
    const current = [...selectedSkills];
    const index = current.indexOf(skill);
    if (index === -1) {
      current.push(skill);
    } else {
      current.splice(index, 1);
    }
    setValue("skills", current, { shouldValidate: true });
  };

  const handleResponseTypeToggle = (type: string) => {
    const current = [...selectedResponseTypes];
    const index = current.indexOf(type);
    if (index === -1) {
      current.push(type);
    } else {
      current.splice(index, 1);
    }
    setValue("preferredResponseTypes", current, { shouldValidate: true });
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof VolunteerFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ["fullName", "email", "mobileNumber", "password", "confirmPassword"];
    } else if (step === 2) {
      fieldsToValidate = ["dob", "city", "state", "availabilityRadius", "skills", "bloodGroup"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const onSubmit = async (data: VolunteerFormData) => {
    setLoading(true);
    try {
      const idProofFileName =
        data.idProof instanceof File
          ? data.idProof.name
          : typeof data.idProof === "string"
            ? data.idProof
            : "Government_ID.pdf";

      const payload = {
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        dob: data.dob,
        city: data.city,
        state: data.state,
        availabilityRadius: data.availabilityRadius,
        skills: data.skills,
        bloodGroup: data.bloodGroup,
        idNumber: data.idNumber,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        relationship: data.relationship,
        preferredResponseTypes: data.preferredResponseTypes,
        emergencyDispatchAvailable: data.emergencyDispatchAvailable,
        infoConsent: data.infoConsent,
        policyConsent: data.policyConsent,
        idProofName: idProofFileName,
        idUpload: idProofFileName,
        certUpload: "Volunteer_Accreditation.pdf",
      };

      console.log("[DEBUG] VOLUNTEER STEP 3 SUBMIT STARTED");
      await registerUser("volunteer", payload);
      console.log("[DEBUG] VOLUNTEER ROLE & USER SET");
      saveProfile("volunteer", payload);
      console.log("[DEBUG] VOLUNTEER PROFILE SAVED");

      setSuccess(true);
      toast.success("Volunteer Registration Completed!");
      console.log("[DEBUG] NAVIGATING TO: /volunteer");
      navigate({ to: "/volunteer" });
    } catch (err: any) {
      console.error("[DEBUG] VOLUNTEER SUBMIT ERROR:", err);
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
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-500/[0.02] to-transparent pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-bold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Roles
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-purple-600 text-white">
              <Users className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-xs text-gray-900">AEGIS RESPONDER</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Responder Registered</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Verifying credentials and adding your coordinates to AEGIS Grid...
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 animate-pulse rounded-full"
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
                  <h1 className="text-xl font-extrabold text-gray-900">Volunteer Sign Up</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        step === s ? "w-6 bg-purple-600" : "w-2 bg-gray-200"
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
                      Full Name
                    </label>
                    <input
                      type="text"
                      {...register("fullName")}
                      placeholder="Aarav Sharma"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 focus:outline-none transition-all"
                    />
                    {errors.fullName?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.fullName.message)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="volunteer@aegis.org"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 focus:outline-none transition-all"
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
                        placeholder="9876543214"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 focus:outline-none transition-all"
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

              {/* STEP 2: Location, Radius & Skills */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        {...register("dob")}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#7C3AED] focus:outline-none bg-white"
                      />
                      {errors.dob?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.dob.message)}
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
                        placeholder="Noida"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#7C3AED] focus:outline-none"
                      />
                      {errors.city?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.city.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        {...register("state")}
                        placeholder="UP"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#7C3AED] focus:outline-none"
                      />
                      {errors.state?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.state.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Availability Radius
                      </label>
                      <select
                        {...register("availabilityRadius")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select Radius</option>
                        <option value="500m">500 meters</option>
                        <option value="1km">1 kilometer</option>
                        <option value="2km">2 kilometers</option>
                        <option value="5km">5 kilometers</option>
                      </select>
                      {errors.availabilityRadius?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.availabilityRadius.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Blood Group
                      </label>
                      <select
                        {...register("bloodGroup")}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                      {errors.bloodGroup?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.bloodGroup.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Qualifications &amp; Active Skills
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_SKILLS.map((skill) => {
                        const isChecked = selectedSkills.includes(skill);
                        return (
                          <button
                            type="button"
                            key={skill}
                            onClick={() => handleSkillToggle(skill)}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                              isChecked
                                ? "border-purple-600/30 bg-purple-50 text-purple-700"
                                : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100/60"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                    {errors.skills?.message && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        ⚠️ {String(errors.skills.message)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Verification, Emergency Contact, Readiness & Consent */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  {/* SECTION 1 — VERIFICATION */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-1">
                      SECTION 1 — VERIFICATION
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Government / Volunteer ID
                      </label>
                      <input
                        type="text"
                        {...register("idNumber")}
                        placeholder="Enter ID Number (e.g. AADHAAR / DL / ID-10492)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 focus:outline-none transition-all"
                      />
                      {errors.idNumber?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.idNumber.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Controller
                        name="idProof"
                        control={control}
                        render={({ field }) => (
                          <VolunteerFileUpload
                            label="ID Proof"
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

                  {/* SECTION 2 — EMERGENCY CONTACT */}
                  <div className="space-y-3.5 pt-2">
                    <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-1">
                      SECTION 2 — EMERGENCY CONTACT
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        {...register("emergencyContactName")}
                        placeholder="Enter contact person name"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 focus:outline-none transition-all"
                      />
                      {errors.emergencyContactName?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.emergencyContactName.message)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Emergency Contact Number
                        </label>
                        <div className="flex gap-2">
                          <span className="inline-flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-500">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            {...register("emergencyContactNumber")}
                            placeholder="Enter 10-digit number"
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 focus:outline-none transition-all"
                          />
                        </div>
                        {errors.emergencyContactNumber?.message && (
                          <p className="text-[10px] text-red-500 font-bold mt-1">
                            ⚠️ {String(errors.emergencyContactNumber.message)}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Relationship
                        </label>
                        <select
                          {...register("relationship")}
                          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 focus:outline-none transition-all bg-white"
                        >
                          <option value="">Select Relationship ▼</option>
                          {RELATIONSHIP_OPTIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                        {errors.relationship?.message && (
                          <p className="text-[10px] text-red-500 font-bold mt-1">
                            ⚠️ {String(errors.relationship.message)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3 — EMERGENCY READINESS */}
                  <div className="space-y-3.5 pt-2">
                    <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-1">
                      SECTION 3 — EMERGENCY READINESS
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Preferred Response Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {RESPONSE_TYPES.map((type) => {
                          const isChecked = selectedResponseTypes.includes(type);
                          return (
                            <button
                              type="button"
                              key={type}
                              onClick={() => handleResponseTypeToggle(type)}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                                isChecked
                                  ? "border-purple-600/30 bg-purple-50 text-purple-700"
                                  : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100/60"
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                      {errors.preferredResponseTypes?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.preferredResponseTypes.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Available for Emergency Dispatch
                      </label>
                      <div className="flex gap-3">
                        {["Yes", "No"].map((opt) => (
                          <button
                            type="button"
                            key={opt}
                            onClick={() =>
                              setValue("emergencyDispatchAvailable", opt, { shouldValidate: true })
                            }
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                              selectedDispatchAvailable === opt
                                ? "border-purple-600/40 bg-purple-50 text-purple-700 shadow-sm"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {errors.emergencyDispatchAvailable?.message && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          ⚠️ {String(errors.emergencyDispatchAvailable.message)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SECTION 4 — CONSENT */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-1">
                      SECTION 4 — CONSENT
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        {...register("infoConsent")}
                        className="rounded mt-0.5 text-purple-600 focus:ring-purple-600 h-4 w-4"
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
                        className="rounded mt-0.5 text-purple-600 focus:ring-purple-600 h-4 w-4"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-600 font-semibold">
                        I agree to AEGIS volunteer response policies.
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
                    ← Previous
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98]"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-3 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Volunteer Account →</span>
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
