import * as yup from 'yup';
import {
  STAFF_TYPES,
  EMPLOYMENT_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  BLOOD_GROUPS,
} from '../constants/staff';
import { PASSWORD_MIN, PASSWORD_MAX } from '../utils/changePassword';

export const createStaffSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
    .required('Password is required'),
  phone: yup.string(),
  branchId: yup.string().required('Branch is required'),
  roleId: yup.string().required('Role is required'),
  designation: yup.string().required('Designation is required'),
  staffType: yup.string().oneOf(STAFF_TYPES, 'Pick a staff type').required(),
  employmentType: yup
    .string()
    .oneOf(EMPLOYMENT_TYPES, 'Pick an employment type')
    .required(),
  gender: yup.string().oneOf(GENDERS, 'Pick a gender').required(),
  joiningDate: yup.string(),
  qualification: yup.string(),
  experienceYears: yup.string(),
  salary: yup.string(),
  dob: yup.string(),
  cnic: yup.string(),
  bloodGroup: yup
    .string()
    .nullable()
    .test('blood', 'Pick a valid blood group', (v) => !v || BLOOD_GROUPS.includes(v)),
  maritalStatus: yup
    .string()
    .nullable()
    .test('marital', 'Pick a marital status', (v) => !v || MARITAL_STATUSES.includes(v)),
  street: yup.string(),
  city: yup.string(),
  state: yup.string(),
  emergencyName: yup.string(),
  emergencyPhone: yup.string(),
  emergencyRelation: yup.string(),
});

// Self-edit: only the fields a staff member can change about themselves.
// Mirrors backend rejection (staff.controller.ts).
export const selfEditSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  phone: yup.string(),
  dob: yup.string(),
  cnic: yup.string(),
  qualification: yup.string(),
  bloodGroup: yup
    .string()
    .nullable()
    .test('blood', 'Pick a valid blood group', (v) => !v || BLOOD_GROUPS.includes(v)),
  maritalStatus: yup
    .string()
    .nullable()
    .test('marital', 'Pick a marital status', (v) => !v || MARITAL_STATUSES.includes(v)),
});

// HR edit (non-self): every field is optional. Email, role and branch cannot
// be changed after creation, and the form offers no password field at all —
// least of all on your own record, where the API refuses one ("Use Change
// password…"): your own password goes through Settings → Change password.
// Only filled fields are sent on submit.
export const editStaffSchema = yup.object().shape({
  name: yup.string().optional(),
  designation: yup.string().optional(),
  staffType: yup.string().optional(),
  employmentType: yup.string().optional(),
  gender: yup.string().optional(),
  maritalStatus: yup.string().optional(),
  bloodGroup: yup.string().optional(),
  cnic: yup.string().optional(),
  dob: yup.string().optional(),
  phone: yup.string().optional(),
  qualification: yup.string().optional(),
  experienceYears: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .optional(),
  salary: yup
    .number()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .optional(),
  joiningDate: yup.string().optional(),
  leavingDate: yup.string().optional(),
  leavingReason: yup.string().optional(),
  isActive: yup.string().optional(),
  street: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  emergencyName: yup.string().optional(),
  emergencyPhone: yup.string().optional(),
  emergencyRelation: yup.string().optional(),
});
