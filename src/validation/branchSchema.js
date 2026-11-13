import * as yup from 'yup';

export const branchSchema = yup.object().shape({
  name: yup.string().required('Branch name is required'),
  address: yup.string().trim().required('Address is required'),
  email: yup.string().email('Invalid email'),
  phone: yup.string(),
  status: yup.string().required(),
});
