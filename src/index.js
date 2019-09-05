// ==UserScript==
// @name       Innovate 2019
// @namespace  https://www.coveo.com/
// @version    0.1
// @description  Add power to your case creation
// @match      https://connect.coveo.com/s/contactsupport*
// @copyright  Coveo 2019
// @grant    GM_xmlhttpRequest
// @connect http://52.90.130.34:5000/*
// @require http://code.jquery.com/jquery-latest.js
// ==/UserScript==
"use strict";

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
  const url = `http://52.90.130.34:5000/predict?q=${userInput}&v=1${
    productId ? "&p=" + productId : ""
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
  const selector = document.querySelector(".forceCommunityContactSupportForm .slds-form:first-child a.select");
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
 * @this {HTMLInputElement}
 */
async function handleInputChange() {
  const inputValue = this.value;

  const shadow = document.getElementById("shadow");
  shadow.innerHTML = "";

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
    predictionSpan.style.color = "#4ED6FF";

    shadow.append(inputSpan, predictionSpan);

    log("predict", prediction);
  } catch (e) {
    console.error(["inovate 2019", e]);
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

  /** @type {HTMLInputElement} */
  const shadow = document.createElement("span");
  shadow.id = "shadow";
  shadow.style.position = "absolute";
  shadow.style.height = "36px";
  shadow.style.left = 0;
  shadow.style.padding = "8px 1rem 0px 13px";

  subjectInput.parentElement.appendChild(shadow);

  let currentHandler;

  subjectInput.addEventListener("input", () => {
    clearTimeout(currentHandler);
    currentHandler = setTimeout(handleInputChange.bind(subjectInput), 500);
  });
}

$(document).ready(handlePageReady);
