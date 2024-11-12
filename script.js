let problemLettersByContest = {}; // Store the list of problems locally
let problemSet = null; // Store the entire problem set

async function fetchProblemSet() {
    const response = await fetch('https://codeforces.com/api/problemset.problems');
    const data = await response.json();
    problemSet = data.result.problems;
}

let colorScheme = 'colorful'; // Default color scheme

function toggleColorScheme() {
    colorScheme = document.getElementById('colorToggle').value;
    fetchVerdicts(); // Re-fetch verdicts when the toggle changes
}

async function fetchVerdicts() {
    const handle = document.getElementById('handle').value;
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
    const data = await response.json();

    if (data.status !== 'OK') {
        alert('Error fetching data. Please check the handle.');
        return;
    }

    const submissions = data.result;
    const contests = await fetchContests(); // Fetch all contests once
    const tbody = document.getElementById('verdictsBody');
    tbody.innerHTML = '';

    const groupedSubmissions = groupByRound(submissions);
    const roundNumbers = Object.keys(groupedSubmissions).sort((a, b) => parseInt(b) - parseInt(a)); // Sort in reverse order

    // Filter contests based on the selected contest filter
    const contestFilter = document.getElementById('contestFilter').value;
    const filteredRounds = filterRoundsByContestType(contests, roundNumbers, contestFilter);

    for (const round of filteredRounds) {
        console.log("Round:", round); // Debugging
        if (groupedSubmissions.hasOwnProperty(round) && parseInt(round) <= 100000) {
            const roundSubmissions = groupedSubmissions[round];
            const contest = contests[round];

            if (!contest) {
                continue; // Skip rounds with missing contest information
            }

            const contestName = contest.name;
            const problemLetters = problemLettersByContest[round] || await fetchProblemLetters(round); // Use locally stored list of problems or fetch it
            console.log("Problem Letters:", problemLetters); // Debugging

            problemLettersByContest[round] = problemLetters; // Store the list of problems locally

            const row = document.createElement('tr');

            // Create cell for contest name
            const contestNameCell = document.createElement('td');
            contestNameCell.textContent = contestName;
            row.appendChild(contestNameCell);

            // Create cell for round ID
            const roundCell = document.createElement('td');
            const roundLink = document.createElement('a');
            roundLink.href = `https://codeforces.com/contest/${round}`;
            roundLink.textContent = round;
            roundLink.target = '_blank'; // Open link in new tab
            roundCell.appendChild(roundLink);

            // Check if all problems are solved
            const allSolved = problemLetters.every(problemLetter => {
                const problemSubmissions = roundSubmissions[problemLetter] || [];
                return getBestVerdictSymbol(problemSubmissions) === '✔'; // Check if all submissions are OK
            });

            // Highlight round cell green if fully solved and color scheme is green/red
            if (allSolved && colorScheme === 'greenRed') {
                roundCell.style.backgroundColor = '#80f47c'; // Green for fully solved
            }

            row.appendChild(roundCell);

            for (const problemLetter of problemLetters.sort()) { // Sort problem letters alphabetically
                const problemCell = document.createElement('td');
                const problemSubmissions = roundSubmissions[problemLetter] || []; // Check if submissions exist for the problem
                const verdict = getBestVerdictSymbol(problemSubmissions);
                problemCell.textContent = `${problemLetter} ${verdict}`; // Include problem letter and verdict symbol
                
                if (colorScheme === 'colorful' && verdict === '✔') {
                    const rating = getProblemRating(round, problemLetter);
                    problemCell.style.backgroundColor = ratingBackgroundColor(rating); // Use rating-based background color
                } else if (colorScheme === 'greenRed') {
                    if (verdict === '✔') {
                        problemCell.style.backgroundColor = '#80f47c'; // Green for checkmark
                    } else if (verdict === '✘') {
                        problemCell.style.backgroundColor = '#f87c7c'; // Red for X
                    } else {
                        problemCell.style.backgroundColor = '#d6d6d6'; // Gray for other verdicts
                    }
                } else {
                    problemCell.style.backgroundColor = '#FFFFFF'; // Default to white
                }
                
                row.appendChild(problemCell);
            }

            tbody.appendChild(row);
        }
    }
}

function filterRoundsByContestType(contests, roundNumbers, filter) {
    if (filter === 'div1') {
        // Filter contests that are only Div. 1 and exclude Div. 2
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Div. 1') && !contests[round].name.includes('Div. 2'));
    } else if (filter === 'div2') {
        // Filter contests that are only Div. 2 and exclude Educational contests
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Div. 2') && 
                                            !contests[round].name.includes('Div. 1') && 
                                            !contests[round].name.includes('Educational'));
    } else if (filter === 'div3') {
        // Filter contests that are Div. 3
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Div. 3'));
    } else if (filter === 'div4') {
        // Filter contests that are Div. 4
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Div. 4'));
    } else if (filter === 'div1+2') {
        // Filter contests that are both Div. 1 and Div. 2 (Div. 1 + 2)
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Div. 1') && contests[round].name.includes('Div. 2'));
    } else if (filter === 'educational') {
        // Filter contests that are Educational
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Educational'));
    } else if (filter === 'global') {
        // Filter contests that are Global Rounds
        return roundNumbers.filter(round => contests[round] && contests[round].name.includes('Global'));
    }
    // Return all rounds if "All" is selected
    return roundNumbers;
}

async function fetchContests() {
    const response = await fetch('https://codeforces.com/api/contest.list');
    const data = await response.json();
    const contests = {};

    if (data.status === 'OK') {
        data.result.forEach(contest => {
            const name = contest.name;
            if (!name.match(/Teams Preferred|NERC|School Team Contest|Preferably Teams|teams allowed|Testing Round|Unknown Language Round|April Fools|Kotlin/i)) {
                    contests[contest.id] = {
                    name: name
                };
            }
        });
    }

    return contests;
}

async function fetchProblemLetters(contestId) {
    if (!problemSet) {
        await fetchProblemSet();
    }

    console.log("Contest:", contestId); // Debugging
    const problems = problemSet.filter(problem => problem.contestId === parseInt(contestId));
    console.log("Filtered Problems:", problems); // Debugging

    return problems.map(problem => problem.index);
}

function groupByRound(submissions) {
    const groupedSubmissions = {};
    submissions.forEach(submission => {
        const round = submission.problem.contestId;
        const problemLetter = submission.problem.index;
        if (!groupedSubmissions[round]) {
            groupedSubmissions[round] = {};
        }
        if (!groupedSubmissions[round][problemLetter]) {
            groupedSubmissions[round][problemLetter] = [];
        }
        groupedSubmissions[round][problemLetter].push(submission);
    });
    return groupedSubmissions;
}

function getBestVerdictSymbol(submissions) {
    const verdicts = submissions.map(submission => submission.verdict);
    if (verdicts.includes('OK')) {
        return '✔'; // Black checkmark
    } else if (verdicts.includes('COMPILATION_ERROR') || verdicts.includes('RUNTIME_ERROR') || verdicts.includes('WRONG_ANSWER') || verdicts.includes('TIME_LIMIT_EXCEEDED')) {
        return '✘'; // Black X
    } else {
        return '−'; // Black hyphen
    }
}

function ratingBackgroundColor(rating) {
    const legendaryGrandmaster      = 'rgba(170,0  ,0  ,0.9)';
    const internationalGrandmaster  = 'rgba(255,51 ,51 ,0.9)';
    const grandmaster               = 'rgba(255,119,119,0.9)';
    const internationalMaster       = 'rgba(255,187,85 ,0.9)';
    const master                    = 'rgba(255,204,136,0.9)';
    const candidateMaster           = 'rgba(255,136,255,0.9)';
    const expert                    = 'rgba(170,170,255,0.9)';
    const specialist                = 'rgba(119,221,187,0.9)';
    const pupil                     = 'rgba(119,255,119,0.9)';
    const newbie                    = 'rgba(204,204,204,0.9)';
    if(rating >= 3000){
        return legendaryGrandmaster;
    } else if(rating >= 2600 && rating <= 2999){
        return internationalGrandmaster;
    } else if(rating >= 2400 && rating <= 2599){
        return grandmaster;
    } else if(rating >= 2300 && rating <= 2399){
        return internationalMaster;
    } else if(rating >= 2100 && rating <= 2299){
        return master;
    } else if(rating >= 1900 && rating <= 2099){
        return candidateMaster;
    } else if(rating >= 1600 && rating <= 1899){
        return expert;
    } else if(rating >= 1400 && rating <= 1599){
        return specialist;
    } else if(rating >= 1200 && rating <= 1399){
        return pupil;
    } else {
        return newbie;
    }
}

function getProblemRating(contestId, problemLetter) {
    if (!problemSet) return null;

    const problem = problemSet.find(problem => problem.contestId === parseInt(contestId) && problem.index === problemLetter);
    return problem ? problem.rating : null;
}
