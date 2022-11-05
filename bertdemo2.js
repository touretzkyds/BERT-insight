class Demo {
    constructor() {
        this.model = null;
        this.question = "";
        this.passage = "";
        return
    }

    // save model for accessibility from methods and console
    initModel(model) {
        this.model = model;
        console.log('model loaded');
        document.getElementById('loading-icon').style.display = "none";
    }

    // uodateQuestion() {
    //     // TODO: move code from answerQuestion here and call this first
    // create a parent function called respond to button click / question submit
    // }
    
    getTokensFromTokenIds(tokenIds) {
        // takes a passage and outputs a subword-generated passage. performs foll:
        // 1. tokenize passage, 2. convert tokens to words/subwords
        // eg. input: fanaticism over baseball, output: ▁fan, atic, ism, ▁over, ▁baseball
        
        // generate vocab
        const tokens = [];
        tokenIds.forEach(tok => {
            tokens.push(this.model.tokenizer.vocab[tok]);
        })
        return tokens;
    }

    // get answers from qna model
    async answerQuestion() {
        const question = document.getElementById('question').value,
              passage = document.getElementById('passage').value,
              answersTextBox = document.getElementById('answer-textbox');

        this.question = question;
        this.passage = passage;

        let answersText = '';

        const answers = await this.model.findAnswers(question, passage);
        this.answers = answers;
        answers.forEach((ans, idx) => {
            const ansText = ans.text.replace(/(\r\n|\n|\r)/gm, " ");
	    const shortScore = (ans.score*1000+0.5).toFixed()/1000;
            answersText += `${idx+1}: ${ansText} | score: ${shortScore}\n`;
        });
        answersTextBox.value = this.answers.length > 0 ? answersText : 'no predictions';
    }

    // plotly based heatmaps
    plotLogits(newPlot = false, logitType = 0) {
        const logitName = ['startlogits', 'endlogits'][logitType];
        const rawData = this.model.rawData;
        const tokens = this.getTokensFromTokenIds(rawData['allTokenIds'][0]);
        const startLogits = rawData['logits'][0];
        const endLogits = rawData['logits'][1];
        const passageLength = rawData['tokensLength'] + 5;
        this.logits = (logitType == 0 ? startLogits : endLogits)[0].slice(0, passageLength);
        this.tokens = tokens.slice(0, passageLength);

        const data = [
            {
                z: this.logits.reverse().map(x => [x]),
                type: "heatmap",
		coloraxis: 'coloraxis',
            }
        ];
        const layout = {
            title: {text: logitName},
            xaxis: {
                showticklabels: false,
                ticks: "",
            },
            yaxis: {
                dtick: 1,
                tickvals: d3.range(this.tokens.length),
                ticktext: this.tokens.reverse(),
                tickfont : {size: 16},
                automargin: true,
            },
	    coloraxis: {cmin: -20, cmax: 10, showscale: false},
            height: 20 * this.tokens.length,
	    width: 260,
        };
        // TODO: only do plotly.react and do not create fully new plots for changes
        if (newPlot) {
            Plotly.newPlot(`${logitName}-heatmap`, data, layout);
        } else {
            Plotly.react(`${logitName}-heatmap`, data, layout);
        }
    }

    async respondToTextSubmit() {
        await this.answerQuestion();
        demo.plotLogits(false, 0);
        demo.plotLogits(false, 1);
    }

    async main() {
        // Load model
        // Notice there is no 'import' statement. 'qna' and 'tf' is
        // available on the index-page because of the script tag.
        qna.load().then(model => {
            demo.initModel(model);
        });
    }
}

const demo = new Demo();
document.addEventListener("DOMContentLoaded", () => {
    demo.main().catch(e => console.error(e));
});
