class Demo {
    constructor() {
        return null;
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
              answerTextBox = document.getElementById('answer-textbox');

        let answerText = '';

        this.model.findAnswers(question, passage).then(answers => {
            this.answers = answers;
            answers.forEach((ans, idx) => {
                answerText += `${idx}: ${ans.text} score: ${ans.score}\n`
            });
            console.log(answers);
            answerTextBox.value = answerText;
        });
    }
}

// TODO: main fn
const demo = new Demo();

// Load model
// Notice there is no 'import' statement. 'qna' and 'tf' is
// available on the index-page because of the script tag above.
qna.load().then(model => {
    demo.initModel(model);
});