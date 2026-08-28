import assert from "node:assert/strict";

import {
  composePhoneFieldValue,
  filterPhoneCountries,
  phoneCountryChoices,
  readNationalDigitsInput,
  readPhoneFieldValue,
} from "@/shared/phone/phone-field-model";

// Every country the phone metadata knows is offered, named in the reader's
// language, and reachable by name, ISO code, or calling code.
const choices = phoneCountryChoices("en");
assert.ok(choices.length > 200, "the picker offers every country");
assert.ok(
  choices.some((choice) => choice.code === "EG" && choice.callingCode === "20"),
  "Egypt keeps its calling code",
);
assert.equal(filterPhoneCountries(choices, "saudi")[0]?.code, "SA");
assert.equal(filterPhoneCountries(choices, "de")[0]?.code, "DE");
assert.equal(filterPhoneCountries(choices, "966")[0]?.code, "SA");
assert.equal(filterPhoneCountries(choices, "zzzz").length, 0);

// A stored value splits back into the country and the digits to edit.
assert.deepEqual(readPhoneFieldValue("+201026546550"), {
  country: "EG",
  nationalDigits: "1026546550",
});
assert.deepEqual(readPhoneFieldValue("+966501234567"), {
  country: "SA",
  nationalDigits: "501234567",
});

// A number typed the legacy Egyptian way still lands on the same value.
assert.deepEqual(readPhoneFieldValue("01026546550"), {
  country: "EG",
  nationalDigits: "1026546550",
});

// An empty value keeps the field on its default country.
assert.deepEqual(readPhoneFieldValue(""), {
  country: "EG",
  nationalDigits: "",
});

// Arabic and Persian digits, the trunk zero, and typed separators never reach
// the value.
assert.equal(readNationalDigitsInput("٠١٠٢٦٥٤٦٥٥٠"), "1026546550");
assert.equal(readNationalDigitsInput("۰۱۰-۲۶۵ ۴۶۵۵۰"), "1026546550");
assert.equal(readNationalDigitsInput("010 2654 6550"), "1026546550");

// The field always emits E.164, partial numbers included.
assert.equal(
  composePhoneFieldValue({ country: "EG", nationalDigits: "1026546550" }),
  "+201026546550",
);
assert.equal(
  composePhoneFieldValue({ country: "SA", nationalDigits: "٥٠١٢٣٤٥٦٧" }),
  "+966501234567",
);
assert.equal(
  composePhoneFieldValue({ country: "EG", nationalDigits: "102" }),
  "+20102",
);
assert.equal(composePhoneFieldValue({ country: "EG", nationalDigits: "" }), "");

// Switching country keeps the digits already typed.
const typed = readPhoneFieldValue("+201026546550");
assert.equal(
  composePhoneFieldValue({ country: "SA", nationalDigits: typed.nationalDigits }),
  "+9661026546550",
);

console.log("Phone field model tests passed.");
