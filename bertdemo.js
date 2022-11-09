class Demo {
    constructor() {
        this.qna = "Not initialized";
        this.updateInputsFromDocument();
        return
    }

    // save model for accessibility from methods and console
    initModel(model) {
        this.qna = model;
        console.log('model loaded');
        document.getElementById('loading-icon').style.display = "none";
    }

    // take an input of token ids and return a series of tokens
    // eg. input: [2058, 24793, 2098], output: ▁over, joy, ed
    // Note that start of a word is marked by an underscore '_'
    getTokensFromTokenIds(tokenIds) {
        const tokens = [];
        // search and add each id from vocab 
        tokenIds.forEach(tok => {
            tokens.push(this.qna.tokenizer.vocab[tok]);
        })
        return tokens;
    }

    updateInputsFromDocument() {
        // update question and passage from demo text boxes
        this.question = document.getElementById('question').value;
        this.passage = document.getElementById('passage').value;
    }

    // find and update answers using qna model inference 
    async answerQuestion() {
        // run qna inference with question and passage
        this.answers = await this.qna.findAnswers(this.question, 
                                                  this.passage);

        // format answers and display to the Answer textbox
        let answersText = '';
        this.answers.forEach((ans, idx) => {
            const txt = ans.text.replace(/(\r\n|\n|\r)/gm, " ");
            answersText += `${idx}: ${txt} | score: ${ans.score}\n`;
        });
        document.getElementById('answer-textbox').value = (
            this.answers.length > 0 ? answersText : 'no predictions'
        );
    }

    // plot the logits 
    plotLogits(newPlot = false, id = 0) { //id = 0:start logits, 1:end logits
        
        const rawData = this.qna.rawData,
              plotId = ['startlogits-heatmap', 'endlogits-heatmap'][id],
              plotTitle = ['Start Logits', 'End Logits'][id],
              truncateLength = rawData['tokensLength'] + 5, // display 5 [PAD] tokens
              logits = rawData['logits'][id][0] // access start or end logits
                            .slice(0, truncateLength),
              tokens = this.getTokensFromTokenIds(
                                rawData['allTokenIds'][0]
                            ).slice(0, truncateLength);

        const data = [
            {
                z: [logits], // expected format is Array(Array)
                type: "heatmap",
                coloraxis: 'coloraxis',
            }
        ];
        const layout = {
            title: {text: plotTitle},
            xaxis: {
                tickvals: d3.range(tokens.length),
                ticktext: tokens,
                tickangle: 270,
                tickfont : {size: 18},
                automargin: true,
            },
            coloraxis: {cmin:-20, cmax:10},
            yaxis: {
                showticklabels: false,
                ticks: "",
            },
            height: 260,
        };
        if (newPlot) {
            Plotly.newPlot(`${plotId}`, data, layout);
        } else {
            Plotly.react(`${plotId}`, data, layout);
        }
    }

    // answer the question and plot logits
    async respondToTextSubmit() {
        this.updateInputsFromDocument();
        await this.answerQuestion();
        this.plotLogits(false, 0);
        this.plotLogits(false, 1);
    }
    
    async main() {
        // Load qna model
        qna.load().then(model => {
            this.initModel(model);
        });
    }
}

const demo = new Demo();
document.addEventListener("DOMContentLoaded", () => {
    demo.main().catch(e => console.error(e));
});
