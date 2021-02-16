import { internal } from './gui-core';

const PRE_LOADED_FUNCTIONS = {
    'heatMap': `colorizer name=getColor colors='#a6a6a6,#ffde59,#ff914d,#ff5757,#ff1616' breaks=0.0,0.25,0.5,0.75,1.0 gradient`
};

export function loadInitalFunctions(gui) {
    Object.entries(PRE_LOADED_FUNCTIONS)
        .forEach(e => {
            let commands = internal.parseConsoleCommands(e[1]);
            internal.runParsedCommands(commands, gui.model, err => console.log(err ? `Error loading the function ${e[0]}: ${err}` : `Function ${e[0]} loaded!`));
        });
}