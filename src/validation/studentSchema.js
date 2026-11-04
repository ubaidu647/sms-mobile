import * as yup from 'yup';
import {
  GENDERS,
  BLOOD_GROUPS,
  ACADEMIC_STATUSES,
  ADMISSION_TYPES,
} from '../constants/students';
import { PASSWORD_MIN, PASSWORD_MAX } from '../utils/changePassword';

const optionalEmail = yup
  .string()
  .nullable()
  .transform((v, o) => (o === '' ? null : v))
  .email('Invalid email')
  .optional();

const optionalNum = (label) =>
  yup
    .number()
    .nullable()
    .typeError(`${label} must be a number`)
    .transform((v, o) => (o === '' ? null : v))
    .optional();

const blood = yup
  .string()
  .nullable()
  .test('blood', 'Pick a valid blood group', (v) => !v || BLOOD_GROUPS.includes(v));

export const createStudentSchema = yup.object().shape({
  // Account
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
    .optional(),
  phone: yup.string().optional(),

  // Enrollment
  branchId: yup.string().required('Branch is required'),
  academicYear: yup
    .string()
    .matches(/^\d{4}-\d{4}$/, 'Format must be YYYY-YYYY')
    .required('Academic year is required'),
  classId: yup.string().required('Class is required'),
  sectionId: yup.string().required('Section is required'),
  admissionDate: yup.string().required('Admission date is required'),
  admissionType: yup.string().oneOf(ADMISSION_TYPES).optional(),

  // Personal
  dob: yup.string().required('Date of birth is required'),
  gender: yup.string().oneOf(GENDERS, 'Pick a gender').required(),
  bloodGroup: blood,
  nationality: yup.string().optional(),
  religion: yup.string().optional(),
  bForm: yup.string().optional(),
  placeOfBirth: yup.string().optional(),

  // Father
  fatherName: yup.string().required('Father name is required'),
  fatherCnic: yup.string().optional(),
  fatherPhone: yup.string().optional(),
  fatherEmail: optionalEmail,
  fatherOccupation: yup.string().optional(),
  fatherMonthlyIncome: optionalNum('Income'),

  // Mother
  motherName: yup.string().required('Mother name is required'),
  motherCnic: yup.string().optional(),
  motherPhone: yup.string().optional(),
  motherOccupation: yup.string().optional(),

  // Emergency
  emergencyName: yup.string().required('Emergency contact name is required'),
  emergencyPhone: yup.string().required('Emergency contact phone is required'),
  emergencyRelation: yup.string().required('Emergency contact relation is required'),

  // Address
  street: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  postalCode: yup.string().optional(),
  country: yup.string().optional(),

  // Previous School (conditional)
  prevSchoolName: yup.string().optional(),
  prevLastClass: yup.string().optional(),
  prevReasonForLeaving: yup.string().optional(),

  // Fees
  feeDiscount: yup
    .number()
    .nullable()
    .min(0, 'Min 0')
    .max(100, 'Max 100')
    .transform((v, o) => (o === '' ? null : v))
    .optional(),
  feeWaiver: yup.string().optional(),
  feeNotes: yup.string().optional(),
});

// Edit: everything optional — backend keeps existing on omitted fields.
// Email, password, class, section, academic year, admission number, roll number
// are NOT editable (web confirms this with a warning banner).
export const editStudentSchema = yup.object().shape({
  name: yup.string().optional(),
  phone: yup.string().optional(),

  dob: yup.string().optional(),
  gender: yup.string().optional(),
  bloodGroup: blood,
  nationality: yup.string().optional(),
  religion: yup.string().optional(),
  bForm: yup.string().optional(),
  placeOfBirth: yup.string().optional(),

  fatherName: yup.string().optional(),
  fatherCnic: yup.string().optional(),
  fatherPhone: yup.string().optional(),
  fatherEmail: optionalEmail,
  fatherOccupation: yup.string().optional(),
  fatherMonthlyIncome: optionalNum('Income'),

  motherName: yup.string().optional(),
  motherCnic: yup.string().optional(),
  motherPhone: yup.string().optional(),
  motherOccupation: yup.string().optional(),

  emergencyName: yup.string().optional(),
  emergencyPhone: yup.string().optional(),
  emergencyRelation: yup.string().optional(),

  street: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  postalCode: yup.string().optional(),
  country: yup.string().optional(),

  academicStatus: yup.string().oneOf(ACADEMIC_STATUSES).optional(),
  isActive: yup.string().optional(),

  feeDiscount: yup
    .number()
    .nullable()
    .min(0, 'Min 0')
    .max(100, 'Max 100')
    .transform((v, o) => (o === '' ? null : v))
    .optional(),
  feeWaiver: yup.string().optional(),
  feeNotes: yup.string().optional(),
});

export const transferStudentSchema = yup.object().shape({
  academicYear: yup
    .string()
    .matches(/^\d{4}-\d{4}$/, 'Format must be YYYY-YYYY')
    .required('Academic year is required'),
  classId: yup.string().required('New class is required'),
  sectionId: yup.string().required('New section is required'),
});
