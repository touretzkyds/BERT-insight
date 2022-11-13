class Demo {
    constructor() {
        this.model = "Not initialized";
        this.updateInputsFromDocument();
    }

    // save model for accessibility from methods and console
    initModel(model) {
        this.model = model;
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
            tokens.push(this.model.tokenizer.vocab[tok]);
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
        this.answers = await this.model.findAnswers(this.question, 
                                                  this.passage);

        // format answers and display to the Answer textbox
        let answersText = '';
        this.answers.forEach((ans, idx) => {
            const txt = ans.text.replace(/(\r\n|\n|\r)/gm, " ");
            answersText += `${idx}: ${txt} | score: ${ans.score.toFixed(3)}\n`;
        });
        document.getElementById('answer-textbox').value = (
            this.answers.length > 0 ? answersText : 'no predictions'
        );
    }

    // plot the logits 
    plotLogits(newPlot = false, id = 0) { //id = 0:start logits, 1:end logits
        
        const rawData = this.model.rawData,
              plotId = ['startlogits-heatmap', 'endlogits-heatmap'][id],
              plotTitle = ['Start Logits', 'End Logits'][id],
              truncateLength = rawData['tokensLength'] + 5, // display 5 [PAD] tokens
              logits = rawData['logits'][id][0] // access start or end logits
                            .slice(0, truncateLength),
              tokens = this.getTokensFromTokenIds(
                                rawData['allTokenIds'][0]
                            ).slice(0, truncateLength);

        const z = logits.reverse().map(x => [x]); // expected format is Array(Array)
                
        const data = [
            {
                z: z,
                yaxis: "y2",
                type: "heatmap",
                coloraxis: 'coloraxis',
            }
        ];
        const layout = {
            title: {text: plotTitle},
            xaxis: {
                showticklabels: false,
                ticks: "",
                domain:[0.55, 1],
            },
            yaxis2: { // yaxis2 helps left align ticks (#1)
                dtick: 1,
                tickvals: d3.range(tokens.length),
                ticktext: tokens.reverse(),
                tickfont : {size: 16},
                anchor: "free",
                side: "right",
                automargin: true,
                ticks: "",
            },
            coloraxis: {
                cmin: -20, 
                cmax: 10, 
                showscale: false
            },
            height: 20 * tokens.length,
            width: 380,
            // TODO: scale width more for cases with very long tokens
            // const longest_tok_width = tokens.reduce(
            //     function (a, b) {return a.length > b.length ? a : b;}).length;

        };
        if (newPlot) {
            Plotly.newPlot(`${plotId}`, data, layout);
        } else {
            Plotly.react(`${plotId}`, data, layout);
        }
    }

    // answer the question and plot logits
    async respondToTextSubmit() {
        this.updateInputsFromDocument(); // update inputs before running qna
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
