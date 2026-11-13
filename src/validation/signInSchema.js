import * as yup from 'yup';

export const signInSchema = yup.object({
  email: yup.string().trim().required('Email is required').email('Invalid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(3, 'Password must be at least 3 characters'),
});
