export class PopupManager {
    popups;
    constructor() {
        this.popups = [];
    }
    addPopup(popup) {
        this.popups.push(popup);
        this.updatePopups();
    }
    removePopup(popup) {
        const index = this.popups.indexOf(popup);
        if (index !== -1) {
            this.popups.splice(index, 1);
            this.updatePopups();
        }
    }
    updatePopups() {
        this.popups.sort((a, b) => b.priority - a.priority);
        let visiblepopups = [];
        for (let popup of this.popups) {
            let shouldDisplay = true;
            for (let visiblePopup of visiblepopups) {
                if (this.doPopupsOverlap(visiblePopup, popup)) {
                    shouldDisplay = false;
                    break;
                }
            }
            if (shouldDisplay) {
                visiblepopups.push(popup);
            }
            else {
                popup.hide();
            }
        }
    }
    doPopupsOverlap(popupA, popupB) {
        const rectA = popupA.getElement().getBoundingClientRect();
        const rectB = popupB.getElement().getBoundingClientRect();
        return (rectA.left < rectB.right && rectA.right > rectB.left && rectA.top < rectB.bottom && rectA.bottom
            > rectB.top);
    }
}
