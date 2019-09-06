// ==UserScript==
// @name       Innovate 2019
// @namespace  https://www.coveo.com/
// @version    0.1
// @description  Add power to your case creation
// @match      https://connect.coveo.com/s/contactsupport*
// @copyright  Coveo 2019
// @grant    GM_xmlhttpRequest
// @connect coveo-hackaton-2019-dev.us-east-1.elasticbeanstalk.com
// @require http://code.jquery.com/jquery-latest.js
// ==/UserScript==
"use strict";

const SUGGESTION_COLOR = "lightgrey";
const TAB = 9;
const RIGHT_ARROW = 39;
const ENTER = 13;

function log(...message) {
  console.log(["Innovate 2019", ...message]);
}

/**
 * Get the prediction based on the **userInput** and the **userId**.
 * (Do an XHR callout)
 * @param {string} userInput The raw input from the user.
 * @param {string} userId The user identifier such as visitId or email.
 * @returns {Promise<string>} The predicted intent.
 */
function getPrediction(userInput, productId) {
  const url = `http://coveo-hackaton-2019-dev.us-east-1.elasticbeanstalk.com/predict?q=${encodeURIComponent(
    userInput
  )}&v=1${
    productId && encodeURIComponent(productId)
      ? "&p=" + encodeURIComponent(productId)
      : ""
  }`;
  log("GET", url);
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onerror: e => reject(e),
      onload: response => {
        try {
          const parsedData = JSON.parse(response.responseText).data.next_phrase
            .phrase_as_string;
          resolve(parsedData);
          log("GET", url, parsedData);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

function getProduct() {
  /** @type {HTMLAnchorElement} */
  const selector = document.querySelector(
    ".forceCommunityContactSupportForm .slds-form:first-child a.select"
  );
  switch (selector.innerText) {
    case "Coveo for Salesforce":
      return "salesforce";
    case "Coveo for Sitecore":
      return "sitecore";
    default:
      return null;
  }
}

let lastPrediction;

/**
 * @param {HTMLInputElement} originalInput
 * @this {HTMLInputElement}
 */
async function handleInputChange(originalInput) {
  const inputValue = this.value;

  if (!inputValue || inputValue == lastPrediction) {
    log("skip");
    return;
  }

  try {
    const prediction = await getPrediction(inputValue, getProduct());
    lastPrediction = prediction;

    const inputSpan = document.createElement("span");
    inputSpan.innerText = inputValue + " ";
    inputSpan.style.color = "transparent";

    const predictionSpan = document.createElement("span");
    predictionSpan.innerText = prediction;
    predictionSpan.style.color = SUGGESTION_COLOR;

    const shadow = document.getElementById("shadow");
    shadow.innerHTML = "";
    shadow.append(inputSpan, predictionSpan);

    originalInput.value = inputValue + " " + prediction;

    originalInput.dispatchEvent(new CustomEvent("keyup"));
    log("predict", prediction);
  } catch (e) {
    console.error(["inovate 2019", e]);
  }
}

let lastSubject;

/**
 * @param {HTMLInputElement} originalInput
 * @this {HTMLInputElement}
 */
function handleKeypress(originalInput, event) {
  const inputValue = this.value;
  const code = event.keyCode;
  if (
    lastPrediction &&
    inputValue != lastSubject &&
    (code == TAB || code == ENTER || code == RIGHT_ARROW)
  ) {
    this.value = inputValue + " " + lastPrediction;
    originalInput.value = inputValue + " " + lastPrediction;
    lastSubject = inputValue + " " + lastPrediction;
  }
}

function handlePageReady() {
  /** @type {HTMLInputElement} */
  const subjectInput = document.querySelector("input.case-subject.input");

  // Push back the call as the page can be slow to fully load with the CREATE CASE form.
  if (!subjectInput) {
    setTimeout(handlePageReady, 500);
    return;
  }

  subjectInput.style.display = "none";

  const shadowInput = document.createElement("input");
  shadowInput.classList.add("case-subject");
  shadowInput.classList.add("input");
  shadowInput.style.backgroundColor = "transparent";

  /** @type {HTMLInputElement} */
  const shadow = document.createElement("span");
  shadow.id = "shadow";
  shadow.style.position = "absolute";
  shadow.style.height = "36px";
  shadow.style.left = 0;
  shadow.style.padding = "9px 1rem 0px 13px";
  shadow.style.zIndex = -1000;

  shadowInput.appendChild(shadow);

  subjectInput.parentElement.appendChild(shadowInput);
  shadowInput.parentElement.appendChild(shadow);

  let currentHandler;

  shadowInput.addEventListener(
    "keydown",
    handleKeypress.bind(shadowInput, subjectInput)
  );
  shadowInput.addEventListener("input", () => {
    clearTimeout(currentHandler);
    currentHandler = setTimeout(
      handleInputChange.bind(shadowInput, subjectInput),
      500
    );

    const shadow = document.getElementById("shadow");
    shadow.innerHTML = "";
  });
}

$(document).ready(handlePageReady);
