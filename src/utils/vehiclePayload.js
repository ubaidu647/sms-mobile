/**
 * The body of a vehicle create or edit.
 *
 * `vehicle` is the stored record on edit, absent on create. A blank optional
 * field is left out, except on edit when the stored record holds a value: then
 * it is sent as '' (text) or null (dates, year) so the backend clears it, since
 * leaving it out keeps the old value.
 */

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

const text = (v) => (isBlank(v) ? undefined : String(v).trim());
const date = (v) => (isBlank(v) ? undefined : v);
const year = (v) => (isBlank(v) || Number.isNaN(Number(v)) ? undefined : Number(v));

export function buildVehiclePayload(form, vehicle) {
  const isEdit = !!vehicle;
  const put = (target, key, value, stored, cleared) => {
    if (value !== undefined) target[key] = value;
    else if (isEdit && !isBlank(stored)) target[key] = cleared;
  };

  const payload = {
    registrationNumber: form.registrationNumber.trim(),
    vehicleType: form.vehicleType,
    capacity: Number(form.capacity),
    fuelType: form.fuelType,
    ownership: form.ownership,
    driver: {
      name: form.driver.name.trim(),
      phone: form.driver.phone.trim(),
      licenseNumber: form.driver.licenseNumber.trim(),
    },
  };

  for (const key of ['make', 'modelName', 'color', 'insuranceNumber', 'trackerId', 'notes']) {
    put(payload, key, text(form[key]), vehicle?.[key], '');
  }
  for (const key of ['insuranceExpiry', 'fitnessExpiry', 'registrationExpiry']) {
    put(payload, key, date(form[key]), vehicle?.[key], null);
  }
  put(payload, 'manufactureYear', year(form.manufactureYear), vehicle?.manufactureYear, null);
  put(payload.driver, 'cnic', text(form.driver.cnic), vehicle?.driver?.cnic, '');
  put(
    payload.driver,
    'licenseExpiry',
    date(form.driver.licenseExpiry),
    vehicle?.driver?.licenseExpiry,
    null,
  );

  // A new vehicle only records a conductor who has a name.
  const conductorName = text(form.conductor.name);
  if (conductorName || isEdit) {
    const conductor = {};
    put(conductor, 'name', conductorName, vehicle?.conductor?.name, '');
    put(conductor, 'phone', text(form.conductor.phone), vehicle?.conductor?.phone, '');
    if (Object.keys(conductor).length > 0) payload.conductor = conductor;
  }

  return payload;
}
