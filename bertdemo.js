class Demo {
    constructor() {
        this.model = "Not initialized";
        this.updateInputsFromDocument();
        this.drawLeaderLines(true); // init leader lines
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
        [this.answers, this.answersRawData] = await this.model.findAnswers(this.question, this.passage);
        // save the number of answers received
        this.numAnswers = this.answers.length;
    }

    // clear answer display before computing new answers
    clearAnswerDisplay() { 
        document.getElementById('no-pred').innerHTML = "";
        for (var i=0; i<5; ++i) {
            const answer = document.getElementById(`answer-${i+1}`);
            answer.innerHTML = "";
        }
    }

    // display "no predictions" or formatted answers computed by qna
    async displayAnswers() {
        // if no predictions
        if (this.numAnswers == 0) {
            document.getElementById('no-pred').innerHTML = "no predictions";
        }
        
        // if predictions exist: format and display answers
        this.answers.forEach((ans, idx) => {
            const answer = document.getElementById(`answer-${idx+1}`);
            const text = ans.text.replace(/(\r\n|\n|\r)/gm, " ");
            const score = ans.score.toFixed(3);
            answer.innerHTML = `${idx+1}: &emsp;${text} &emsp;|&emsp; score: ${score}\n`; // &emsp; — tab spaces
        });
    }

    // plot the logits 
    plotLogits(newPlot = false, id = 0) { //id = 0:start logits, 1:end logits
        
        const rawData = this.model.logitsRawData,
              plotElemId = ['startlogits-heatmap', 'endlogits-heatmap'][id],
              plotTitle = ['Start Logits', 'End Logits'][id],
              truncateLength = rawData['tokensLength'] + 5, // display 5 [PAD] tokens
              logits = rawData['logits'][id][0] // access start or end logits
                            .slice(0, truncateLength).reverse();
        
        const z = logits.map(x => [x]); // expected format is Array(Array)

        this.tokens = this.getTokensFromTokenIds(rawData['allTokenIds'][0]
        ).slice(0, truncateLength);
        this.selectedTokenIds = [8,27];

        const text = z.map((row, i) => row.map((item, _) => { 
            return `id: ${this.tokens.length - i - 1}`+
            `<br>token: ${this.tokens[this.tokens.length - i - 1]}` +
            `<br>logit: ${item.toFixed(5)}`
            }));

        const data = [
            {
                x: "",
                z: z,
                yaxis: "y2",
                type: "heatmap",
                coloraxis: 'coloraxis',
                text: text,
                hoverinfo: "text",
            }
        ];
        const layout = {
            title: {text: plotTitle},
            xaxis: {
                showticklabels: false,
                ticks: "",
                domain:[0.7, 0.85],
            },
            yaxis2: { // yaxis2 helps left align ticks (#1)
                tickvals: d3.range(this.tokens.length).reverse(), 
                ticktext: this.tokens, 
                showticklabels: id==0, // only show ticks for start logits
                tickfont : {size: 16},
                anchor: "free",
                side: "right",
                automargin: true,
                ticks: "",
            },
            plot_bgcolor:"black",  // remove white- 
            paper_bgcolor:"#FFF3", // -spaces hiding leaderlines
            coloraxis: {
                cmin: -20, 
                cmax: 10, 
                showscale: false
            },
            height: 20 * this.tokens.length,
            width: 350,
            // TODO: scale width more for cases with very long tokens
            // const longest_tok_width = tokens.reduce(function (a, b) {return a.length > b.length ? a : b;}).length;

        };
        if (newPlot) {
            Plotly.newPlot(`${plotElemId}`, data, layout);
        } else {
            Plotly.react(`${plotElemId}`, data, layout);
        }
        // bind click event
        let plotlyLogits = document.getElementById(plotElemId);
        plotlyLogits.on("plotly_click", (data) => {
            this.reactToLogitsClick(data, id);
        });
    }

    // update embedding plots when tokens in logits heatmaps are clicked
    // start logits: plots 0,2 and end logits: plots 1,3
    reactToLogitsClick(clickData, logPlotId) {
        // save clicked token id depending on which plot it is clicked in
        this.selectedTokenIds[logPlotId] = 
        this.tokens.length - clickData.points[0].pointNumber[0] - 1; // token order reversed in plotly
        if (logPlotId == 0) {
            this.updateEmbPlot(0, this.selectedTokenIds[0]);
            this.updateEmbPlot(2, this.selectedTokenIds[0]);
        }
        else {
            this.updateEmbPlot(1, this.selectedTokenIds[1]);
            this.updateEmbPlot(3, this.selectedTokenIds[1]);
        }
    }

    // initialize array of leader lines
    initLeaderLines() {
        // initialize array of 5 leaderlines
        this.leaderLines = [];
        for (var i=0; i<5; ++i) {
            const anchor1 = document.getElementById('no-pred'); // dummy elem
            const anchor2 = document.getElementById(`answer-${i+1}`); // dummy elem
            const line = new LeaderLine(
                anchor1, anchor2,
                {
                    path: 'grid',
                    color: 'black',
                    hide: true,
                    startPlug: 'arrow1',
                    startSocket: 'right', 
                    endSocket: 'left',
                    middleLabel: `${i+1}`,
                    size: 0.5,
                    startPlugSize: 6,
                    endPlugSize: 6,
                }
            )
            this.leaderLines.push(line);
        }
        document.getElementsByClassName('leader-line').forEach((elem, idx) => {
            // restructure HTML
            document.getElementById('leaderlines').appendChild(elem);
            elem.id = `leader-line-${idx+1}`;
            // add event listener
        });

        // initialize linpaced start and end points map for lines
        this.linesXVals = {
            0: [],
            1: [170,480],
            2: [170,325,480],
            3: [170,273,377,480],
            4: [170,248,325,403,480],
            5: [170,240,300,360,420,480]
        }
    }

    // draw or update leader lines to plot between start and end logits
    drawLeaderLines(init) {
        if (init) { 
            this.initLeaderLines();
        }
        else {
            const xVals = this.linesXVals[this.numAnswers];
            this.leaderLines.forEach((line, idx) => {
                if (idx < this.numAnswers) { // update and show line if answer exists
                    // get raw token indices
                    const startIdx = this.answersRawData.origResults[idx].start;
                    const endIdx = this.answersRawData.origResults[idx].end;
                    const startElem = document.querySelector(`#startlogits-heatmap > div > div > svg:nth-child(1) > g.cartesianlayer > g > g.yaxislayer-above > g:nth-child(${startIdx+1})`);
                    const endElem = document.querySelector(`#startlogits-heatmap > div > div > svg:nth-child(1) > g.cartesianlayer > g > g.yaxislayer-above > g:nth-child(${endIdx+1})`);
                    const startAnchor = LeaderLine.pointAnchor(
                        startElem,
                        {x: xVals[idx]},
                    );
                    const endAnchor = LeaderLine.pointAnchor(
                        endElem,
                        {x: xVals[idx+1]},
                    );
                    const options = {
                        start: startAnchor,
                        end: endAnchor,
                    };
                    line.setOptions(options);
                    line.show();
                }
                else {
                    const options = {
                        start: document.getElementById('no-pred'),
                        end: document.getElementById(`answer-${idx+1}`),
                        hide: true,
                        size: 0.5,
                        startPlugSize: 5,
                        endPlugSize: 5,
                    };
                    line.hide();
                    line.setOptions(options);
                }
            });
        }
    }

    // show hidden elements ie dropdowns on event call after submit
    makeElemsVisible(){
        const elems = document.getElementsByClassName('hidden').forEach(elem => {
            elem.style.visibility = 'visible';
        });
    }

    // check selection in attention dropdown and plot corresponding attention plot
    plotFromDropdown() {
        const dropDown = document.getElementById('attn-dropdown');
        
        // if no selections made, plot nothing
        if (dropDown.value === "---Choose layer---") {
            document.getElementById('attention-heatmaps').style.display = "none";
            return;
        }
        
        // activate attention dropdown and plot attention if dropdown selected
        document.getElementById('attention-heatmaps').style.display = "block";
        const layerId = dropDown.options[dropDown.selectedIndex].text;
        const layerName = `bert/encoder/layer_${layerId}/attention/self/Softmax`;
        const rawData = this.model.logitsRawData;
        const layerData = rawData['intermLayers'][layerName];
        const truncateLength = rawData['tokensLength'] + 5;
        
        for (var headId=0; headId<4; ++headId) {
            const headData = layerData[0][headId].slice(0, truncateLength).map(i => i.slice(0, truncateLength));
            this.plotAttention(headData, headId, layerName);
        }
        // const diagonalData = [[],[],[],[]];
        // for (var h=0; h<4; ++h){
        //     const headData = layerData[0][h];
        //     // for (var d=0; d<truncateLength; ++d){
        //     //     diagonalData[h].push(headData[d][d]);
        //     // }
        // }
        return layerData; // for debugging
    } 

    // plot heatmap with attention matrix
    plotAttention(headData, headId, layerName) {
        const text = headData.map((row, i) => row.map((item, j) => { 
            return `input: ${this.tokens[i]}`+
            `<br>output: ${this.tokens[j]}` +
            `<br>attention: ${item.toFixed(5)}`
            }));
            
        const data = [
            {
                z: headData,
                type: "heatmap",
                coloraxis: 'coloraxis',
                text: text,
                hoverinfo: "text",
            }
        ];
        const layout = {
            title: {
                text:'layer: '+layerName+': head '+headId,
                y: "0.07",
            },
            xaxis: {
                title: "output attention tokens",
                side: "top",
                tickvals: d3.range(this.tokens.length), 
                ticktext: this.tokens, 
            },
            yaxis: {
                title: "input attention tokens",
                autorange: 'reversed',
                tickvals: d3.range(this.tokens.length), 
                ticktext: this.tokens, 
                showticklabels: true,
                tickfont : {size: 10},
            },
            width: 650,
            height: 650,
        };
        // create element if absent
        Plotly.react(`attn-heatmap-head-${headId}`, data, layout);
    }

    plotEmbeddings(newPlot=false, wordIdx=0, layerIdx=0, plotNum=0) { 
        
        // get embedding vector
        const embedding = [this.model.logitsRawData.intermLayers[
            `bert/encoder/layer_${layerIdx}/attention/self/key/add`
        ][wordIdx]], // expected format is Array(Array)
            plotTitle = `${wordIdx}: ${this.tokens[wordIdx]}`,
            plotId = `embedding-heatmap-${plotNum}`;

        const z = embedding[0].map((_, colIndex) => embedding.map(row => row[colIndex]));
        const data = [
            {
                z: z,
                type: "heatmap",
                coloraxis: 'coloraxis',
            }
        ];
        const layout = {
            title: {text: plotTitle},
            xaxis: {
                showticklabels: false,
                ticks: "",
            },
            yaxis: {
                ticks: "",
                autorange: 'reversed',
            },
            coloraxis: {
                showscale: false
            },
            height: 20 * this.tokens.length,
            width: 200,
        };
        if (newPlot) {
            Plotly.newPlot(`${plotId}`, data, layout);
        } else {
            Plotly.react(`${plotId}`, data, layout);
        }
    }

    // refresh embedding plots based on dropdown and selected token
    updateEmbPlot(plotId, tokenId){
        // get layer id from dropdown
        const dropdown = document.getElementById(`embedding-dropdown-${plotId}`);
        const layerId = dropdown.value;
        // if no selections made, plot nothing
        if (layerId === "---Choose layer---") {
            return;
        }
        this.plotEmbeddings(false, tokenId, layerId, plotId);
    }

    // respond to question answering submit button press
    async respondToTextSubmit() {

        // clear old answers from display
        this.clearAnswerDisplay();

        // update question and passage ie. inputs before running qna
        this.updateInputsFromDocument(); 

        // run qna on inputs
        await this.answerQuestion();

        // plot start logits
        this.plotLogits(false, 0);

        // plot end logits
        this.plotLogits(false, 1);

        // this.embPlotActiveIdx = 1;
        // this.makeTicksClickable();

        // plot embeddings with args newplot, token_idx, layer_idx, plot_num
        this.updateEmbPlot(0, this.selectedTokenIds[0]);
        this.updateEmbPlot(1, this.selectedTokenIds[1]);
        this.updateEmbPlot(2, this.selectedTokenIds[0]);
        this.updateEmbPlot(3, this.selectedTokenIds[1]);
        
        // display computed answers in the Answer HTML field
        await this.displayAnswers();

        // draw leader lines between answer tokens on heatmap
        this.drawLeaderLines();

        // show dropdown on first submit button press and 
        // plot attention if a dropdown option is selected on submit
        this.makeElemsVisible();
        this.plotFromDropdown();
    }

    // TODO: replace HTML code by 
    // makeAnswersHoverable() {
    //     for (var idx=1; idx<6; ++idx) {
    //         document.getElementById(`answer-${idx}`).addEventListener('onmouseover', this.respondToHover(idx, 'enter')).addEventListener('onmouseout', this.respondToHover(idx, 'exit'));
    //     }
    // }

    // highlight arrows on hover in and un-highlight on hover out
    respondToHover(idx, hover='exit') {
        if (hover==='enter') {
            const line = this.leaderLines[idx-1];
            const options = {
                dropShadow: true,
                dash: {len:8, gap:4, animation: true},
                size: 2,
                startPlugSize: 2,
                endPlugSize: 2,
            };
            line.setOptions(options);
        }
        else {
            const line = this.leaderLines[idx-1];
            const options = {
                dropShadow: false,
                dash: false,
                size: 0.5,
                startPlugSize: 5,
                endPlugSize: 5,
            };
            line.setOptions(options);
        }
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
