class Demo {
    constructor() {
        this.model = null;
        return
    }

    // save model for accessibility from methods and console
    initModel(model) {
        this.model = model;
        console.log('model loaded');
        document.getElementById('loading-icon').style.display = "none";
    }
    
    answerQuestion() {
        const question = document.getElementById('question').value,
              passage = document.getElementById('passage').value,
              answersTextBox = document.getElementById('answer-textbox');

        let answersText = '';

        this.model.findAnswers(question, passage).then(answers => {
            this.answers = answers;
            answers.forEach((ans, idx) => {
                const ansText = ans.text.replace(/(\r\n|\n|\r)/gm, " ");
                answersText += `${idx}: ${ansText} | score: ${ans.score}\n`;
            });
            answersTextBox.value = this.answers.length > 0 ? answersText : 'no predictions';
        });
    }

// trial code for plotly based heatmaps
//     plotWeights(newPlot = false) {
//         const rawData = this.model.model.artifacts.weightData
//         const array = [...new Uint8Array(rawData).slice(4096,8192)]
//         const weights = [];
//         while (array.length) weights.push(array.splice(0,64));
//         console.log('weights:\n', weights);
//         const data = [
//             {
//                 z: weights,
//                 type: "heatmap",
//             }
//         ];
//         const layout = {
//             title: {text: "Weights"},
//         };
//         if (newPlot) {
//             Plotly.newPlot("heatmap", data, layout);
//             const heatmap = document.getElementById("heatmap");
//         } else {
//             Plotly.react("heatmap", data, layout);
//         }
//     }
// }

// class Plots extends Demo {
//     constructor() {
//         super();
//     }
// }

// TODO: main fn
const demo = new Demo();
// const plots = new Plots();

// Load model
// Notice there is no 'import' statement. 'qna' and 'tf' is
// available on the index-page because of the script tag above.
qna.load().then(model => {
    demo.initModel(model);
});