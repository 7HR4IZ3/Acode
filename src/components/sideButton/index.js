import "./style.scss";

/**@type {HTMLDivElement} */
export const sideButtonContainer = (
  <div className="side-buttons">
    <div className="side-button seperator"></div>
  </div>
);

export default function SideButtons({
  text,
  icon,
  onclick,
  bottom,
  backgroundColor,
  textColor,
  hover
}) {
  const $button = (
    <button
      className={"side-button" + (hover ? " hover" : "")}
      onclick={onclick}
      style={
        {
          /* backgroundColor, color: textColor*/
        }
      }
    >
      <i className={`icon ${icon}`}></i>
      {text && <span>{text}</span>}
    </button>
  );

  return {
    show() {
      const seperator = sideButtonContainer.get(".seperator");
      bottom ? seperator.after($button) : seperator.before($button);
    },
    hide() {
      $button.remove();
    }
  };
}
