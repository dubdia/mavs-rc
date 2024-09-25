/** returns the hex color from given css */
export const computeColor = (css: string): string => {
    // Create a temporary element
    let tempElement = document.createElement("div");

    // Apply the CSS style to the element
    tempElement.style.backgroundColor = css;

    // Append the element to the body
    document.body.appendChild(tempElement);

    // Get the computed style of the element
    let computedStyle = window.getComputedStyle(tempElement);

    // Get the background color
    let backgroundColor = computedStyle.getPropertyValue("background-color");

    // Remove the temporary element
    document.body.removeChild(tempElement);

    return backgroundColor;
}