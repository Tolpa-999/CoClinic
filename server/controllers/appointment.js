import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/errorResponse.js";
import appointmentValidator from "../schema/appointmentManagementValidator.js";
import { STATUS_CODE } from "../utils/httpStatusCode.js";
import User from "../models/User.js";



// POST /appointments
export const bookAppointment = async (req, res, next) => {
  const { doctorId, start, notes } = req.body;

  const errorInValidation = appointmentValidator("createAppointment", req.body);
  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const patientId = req.user.userId;

  const patientExists = User.findById(req.user.userId)

  if (!patientExists) {
    return next(new ErrorResponse("patient not found", 404));
  }

  const doctor = await User.findById(doctorId)

  if (!doctor) {
    return next(new ErrorResponse("doctor not found", 404));
  }

  if(!doctor.isDoctor) {
    return next(new ErrorResponse("you only can book appointment with doctors", 403));
  }

  const startDate = new Date(start)

  const end = new Date(startDate.getTime() + 30 * 60 * 1000);

  const currentDate = new Date();
if (startDate.getTime() <= currentDate.getTime()) {
  return next(new ErrorResponse("Cannot book appointment in the past", 400));
}



  // 1) Check for overlapping appointments:
  const conflict = await Appointment.findOne({
    doctor: doctorId,
    $or: [
      { start: { $lt: end }, end: { $gt: startDate } }
    ]
  });
  if (conflict) {
    return next(new ErrorResponse("This doctor isn't free at this time ", 400));
  }

  // 2) Create appointment
  const data = await Appointment.create({
    doctor: doctorId,
    patient: patientId,
    start: startDate, 
    end, 
    notes
  });

  res.status(201).json({ 
    data,
    status: STATUS_CODE.SUCCESS,
    message: "appointment created successfully and the appointment last for 30 mins after the start date "
    });
};


// GET /api/v1/appointments/me (Patient)
export const getPatientAppointments = catchAsync(async (req, res, next) => {
  // Validate query parameters
  const errorInValidation = appointmentValidator("getAppointments", req.query);
  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate
  } = req.query;

  const filters = { patient: req.user.userId };

  if (status) filters.status = status;
  
  if (startDate || endDate) {
    filters.start = {};
    if (startDate) filters.start.$gte = new Date(startDate);
    if (endDate)   filters.start.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const data = await Appointment.find(filters)
    .populate("doctor", "name email")
    .sort("start")
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: "Patient appointments retrieved successfully"
  });
});

// GET /api/v1/appointments/doctor (Doctor)
export const getDoctorAppointments = catchAsync(async (req, res, next) => {
  const errorInValidation = appointmentValidator("getAppointments", req.query);
  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate
  } = req.query;

  const filters = { doctor: req.user.userId };
  if (status) filters.status = status;
  if (startDate || endDate) {
    filters.start = {};
    if (startDate) filters.start.$gte = new Date(startDate);
    if (endDate)   filters.start.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const data = await Appointment.find(filters)
    .populate("patient", "name email")
    .sort("start")
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: "Doctor appointments fetched successfully"
  });
});             
//doctor 
// PUT /api/v1/appointments/
//status
//status
export const updateAppointmentStatus = catchAsync(async (req, res, next) => {
  // Validate params and body
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorResponse("Invalid appointment ID", STATUS_CODE.ERROR));
  }
  const errorInValidation = appointmentValidator("updateStatus", req.body);
  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const { status } = req.body;
  const data = await Appointment.findById(id);
  if (!data) {
    return next(new ErrorResponse("Appointment not found", STATUS_CODE.ERROR));
  }

  // Only doctor or admin can change status
  if (String(data.doctor) !== req.user.userId && !req.user.isAdmin) {
    return next(new ErrorResponse("Unauthorized to update status", STATUS_CODE.FORBIDDEN));
  }

  // Prevent illegal transitions
  if (["cancelled", "completed"].includes(data.status)) {
    return next(new ErrorResponse(
      `Cannot modify a ${data.status} appointment`,
      STATUS_CODE.ERROR
    ));
  }

  data.status = status;
  await data.save();

  res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: "Appointment status updated successfully"
  });
});

// DELETE /api/v1/appointments/:id
export const cancelAppointment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorResponse("Invalid appointment ID", STATUS_CODE.ERROR));
  }

  const data = await Appointment.findById(id);
  if (!data) {
    return next(new ErrorResponse("Appointment not found", STATUS_CODE.NOT_FOUND));
  }

  // Authorization
  const isPatient = String(data.patient) === req.user.userId;
  const isDoctor  = String(data.doctor ) === req.user.userId;
  if (!isPatient && !isDoctor && !req.user.isAdmin) {
    return next(new ErrorResponse("Unauthorized to cancel", STATUS_CODE.FORBIDDEN));
  }

  // Business rules
  const now = new Date();
  if (data.start < now) {
    return next(new ErrorResponse("Cannot cancel past appointments", STATUS_CODE.BAD_REQUEST));
  }
  if (data.status === "cancelled") {
    return next(new ErrorResponse("Appointment is already cancelled", STATUS_CODE.BAD_REQUEST));
  }
  if (isPatient && data.status !== "pending") {
    return next(new ErrorResponse(
      "Patients can only cancel pending appointments",
      STATUS_CODE.BAD_REQUEST
    ));
  }

  data.status = 'cancelled';
  await data.save();

  res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: "Appointment cancelled successfully"
  });
});


export const getDoctors = catchAsync( async (req ,res, next) => {

  const data = await User.find({isDoctor: true, approved: true})

  if(!data) {
    next(new ErrorResponse("there is no doctors right now", 404))
  }

  return res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: "doctors founded successfully"
  })

})