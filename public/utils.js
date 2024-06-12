function flashDivBackground(div,color,duration=300){
    div.classList.add("transition",`duration-${duration}`,"ease-in-out",`bg-${color}`);
    setTimeout(() => {
        div.classList.remove(`bg-${color}`);
    }, duration);
}