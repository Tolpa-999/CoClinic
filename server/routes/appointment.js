import { Router } from 'express';
import verifyToken  from '../utils/verifyUser.js';
import {
  bookAppointment,
  getDoctorAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getDoctors,
} from '../controllers/appointment.js';
import verifyAdmin from '../middleware/adminMiddleware.js';
import verifyDoctor from '../middleware/doctorMiddleware.js';

const router = Router();

// Patients
router.post('/create', verifyToken, bookAppointment);

router.get('/patient', verifyToken, getPatientAppointments);
router.get('/doctor', verifyToken, verifyDoctor, getDoctorAppointments);
router.get('/doctors', getDoctors)


router.put('/status/:id', verifyToken, updateAppointmentStatus);

router.delete('/delete/:id', verifyToken, cancelAppointment);
// Doctors

export default router;
