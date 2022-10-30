class Demo {
    constructor() {
        this.model = null;
        this.question = null;
        this.passage = null;
        return
    }

    // save model for accessibility from methods and console
    initModel(model) {
        this.model = model;
        console.log('model loaded');
        document.getElementById('loading-icon').style.display = "none";
        // this.answerQuestion();
    }

    // uodateQuestion() {
    //     // TODO: move code from answerQuestion here and call this first
    // create a parent function called respond to button click / question submit
    // }
    
    getPassageSubwords() {
        // takes a passage and outputs a subword-generated passage. performs foll:
        // 1. tokenize passage, 2. convert tokens to words/subwords
        // eg. input: fanaticism over baseball, output: ▁fan, atic, ism, ▁over, ▁baseball
        
        // tokenize passage
        const tok_passage = this.model.tokenizer.tokenize(this.passage);
        // generate subwords
        const subwords = [];
        tok_passage.forEach(token => {
            subwords.push(this.model.tokenizer.vocab[token]);
        })
        return subwords;
    }

    async answerQuestion() {
        const question = document.getElementById('question').value,
              passage = document.getElementById('passage').value,
              answersTextBox = document.getElementById('answer-textbox');

        this.question = question;
        this.passage = passage;

        this.passageSubwords = this.getPassageSubwords();

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
// }

    // trial code for plotly based heatmaps
    plotLogits(newPlot = false, logitType = 0) { // TODO: use logitType argument
        const logitName = ['startlogits', 'endlogits'][logitType];
        const passageWords = this.answers[0].origTokens.map(tok => tok.text);
        const passageLength = passageWords.length;
        const allLogits = logitType == 0 ? this.answers[0].startLogits : this.answers[0].endLogits;
        const logits = new Array([...new Float32Array(allLogits)].slice(8, passageLength+8));
        
        const data = [
            {
                z: logits,
                type: "heatmap",
            }
        ];
        const layout = {
            title: {text: logitName},
            xaxis: {
                dtick: 1,
                tickvals: d3.range(passageLength),
                ticktext: passageWords,
                tickangle: 270,
            },
        };
        // TODO: only do plotly.react and do not create fully new plots for changes
        if (newPlot) {
            Plotly.newPlot(`${logitName}-heatmap`, data, layout);
        } else {
            Plotly.react(`${logitName}-heatmap`, data, layout);
        }
    }
}

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

// TODO: use this fn for async update
document.addEventListener('submit', (e) => {
    // Store reference to form to make later code easier to read
    demo.answerQuestion().then(data => {
        // Do the work here
        demo.plotLogits(false, 0);
        demo.plotLogits(false, 1);
    });
});
