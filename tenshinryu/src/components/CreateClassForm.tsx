"use client";

import { useState, lazy, Suspense } from "react";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LocationPicker = lazy(() => import("./LocationPicker"));

interface CreateClassFormProps {
  instructors: { id: string; name: string }[];
  dojoId: string;
  onSuccess?: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface FormData {
  name: string;
  instructorId: string;
  days: string[];
  startDate: Date | null;
  endDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  location: string;
  lat: number | null;
  lng: number | null;
  maxStudents: number;
}

export default function CreateClassForm({
  instructors,
  dojoId,
  onSuccess,
}: CreateClassFormProps) {
  const [showMap, setShowMap] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      instructorId: "",
      days: [],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      location: "",
      lat: null,
      lng: null,
      maxStudents: 30,
    },
  });

  const watchedDays = watch("days");
  const watchedLocation = watch("location");
  const watchedLat = watch("lat");
  const watchedLng = watch("lng");

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setValue("lat", lat);
    setValue("lng", lng);
    setValue("location", address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitResult(null);

    // Format schedule string
    const daysStr = data.days.join(", ");
    const startTimeStr = data.startTime
      ? data.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";
    const endTimeStr = data.endTime
      ? data.endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";
    const schedule = `${daysStr} ${startTimeStr}-${endTimeStr}`;

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          schedule,
          startDate: data.startDate?.toISOString().split("T")[0] || null,
          endDate: data.endDate?.toISOString().split("T")[0] || null,
          instructorId: data.instructorId,
          maxStudents: data.maxStudents,
          location: data.location,
          lat: data.lat,
          lng: data.lng,
          dojoId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({ success: true, message: "Class created successfully!" });
        reset();
        onSuccess?.();
      } else {
        setSubmitResult({
          success: false,
          message: result.error || "Failed to create class",
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "Network error. Please try again.",
      });
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none text-white";

  // Custom styles for react-datepicker to match dark theme
  const datePickerWrapperClass = "w-full";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitResult && (
        <div
          className={`p-3 rounded ${
            submitResult.success
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {submitResult.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Class Name *
        </label>
        <input
          type="text"
          {...register("name", { required: "Class name is required" })}
          className={inputClass}
          placeholder="e.g., Kids BJJ Beginners"
        />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Instructor *
        </label>
        <select
          {...register("instructorId", { required: "Instructor is required" })}
          className={inputClass}
        >
          <option value="">Select an instructor</option>
          {instructors.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>
        {errors.instructorId && (
          <p className="text-red-400 text-sm mt-1">
            {errors.instructorId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Start Date *
          </label>
          <Controller
            control={control}
            name="startDate"
            rules={{ required: "Start date is required" }}
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                minDate={new Date()}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                className={inputClass}
                wrapperClassName={datePickerWrapperClass}
                calendarClassName="bg-gray-900 border border-gray-700"
                popperClassName="z-50"
              />
            )}
          />
          {errors.startDate && (
            <p className="text-red-400 text-sm mt-1">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            End Date (Optional)
          </label>
          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                minDate={watch("startDate") || new Date()}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                className={inputClass}
                wrapperClassName={datePickerWrapperClass}
                calendarClassName="bg-gray-900 border border-gray-700"
                popperClassName="z-50"
              />
            )}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Days of Week *
        </label>
        <div className="flex flex-wrap gap-4">
          {DAYS.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={day}
                {...register("days", {
                  validate: (v) => v.length > 0 || "Select at least one day",
                })}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-gray-300">{day}</span>
            </label>
          ))}
        </div>
        {errors.days && (
          <p className="text-red-400 text-sm mt-1">{errors.days.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Start Time *
          </label>
          <Controller
            control={control}
            name="startTime"
            rules={{ required: "Start time is required" }}
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={30}
                timeCaption="Time"
                dateFormat="h:mm aa"
                placeholderText="Select time"
                className={inputClass}
                wrapperClassName={datePickerWrapperClass}
                popperClassName="z-50"
              />
            )}
          />
          {errors.startTime && (
            <p className="text-red-400 text-sm mt-1">
              {errors.startTime.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            End Time *
          </label>
          <Controller
            control={control}
            name="endTime"
            rules={{ required: "End time is required" }}
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={30}
                timeCaption="Time"
                dateFormat="h:mm aa"
                placeholderText="Select time"
                className={inputClass}
                wrapperClassName={datePickerWrapperClass}
                popperClassName="z-50"
              />
            )}
          />
          {errors.endTime && (
            <p className="text-red-400 text-sm mt-1">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Location
        </label>
        <input
          type="text"
          {...register("location")}
          className={inputClass}
          placeholder="e.g., Main Dojo, Park, School Gym"
        />

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="mt-2 text-sm text-red-400 hover:text-red-300"
        >
          {showMap ? "Hide map" : "Pick on map"}
        </button>

        {showMap && (
          <div className="mt-2">
            <Suspense
              fallback={
                <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center">
                  Loading map...
                </div>
              }
            >
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                defaultLocation={
                  watchedLat && watchedLng
                    ? { lat: watchedLat, lng: watchedLng }
                    : undefined
                }
              />
            </Suspense>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Max Students
        </label>
        <input
          type="number"
          min={1}
          max={100}
          {...register("maxStudents", { valueAsNumber: true })}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg font-semibold transition"
      >
        {isSubmitting ? "Creating..." : "Create Class"}
      </button>
    </form>
  );
}
