// Category -> department routing. Edit this map to change where new complaints go.
// Values are Department.name values (see seedService.js).
export const CATEGORY_DEPARTMENT = {
  "Technical Issue": "IT Support",
  "Network and Internet": "IT Support",
  "Infrastructure and Maintenance": "Facilities",
  "Water and Sanitation": "Facilities",
  "Electricity and Safety": "Electrical",
  "Academic or Administrative": "Administration",
  "Hostel or Accommodation": "Administration",
  Other: "Administration",
};

export const DEFAULT_DEPARTMENT_NAME = "Administration";

export function departmentNameForCategory(category) {
  if (!category) return DEFAULT_DEPARTMENT_NAME;
  return CATEGORY_DEPARTMENT[category] || DEFAULT_DEPARTMENT_NAME;
}
