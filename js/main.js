const vowelList = ['a', 'e', 'i', 'o', 'u', 'y'],
    consonantList = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
        'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'],
    punctuationList = ['.', ',', '!', '?', ':', ';'],
    characterList = vowelList.concat(consonantList, punctuationList),
    margin = { top: 10, bottom: 10, left: 10, right: 10 },
    color = d3.scaleOrdinal().domain(['vowels', 'consonants', 'punctuations']).range(d3.schemeAccent),
    vowelCount = {}, consonantCount = {}, punctuationCount = {},
    precedingOccurrences = {}, succeedingOccurrences = {};

var treeMapSvg, sankeySvg, inputText, inputCharacters, sankeyFlowLabel,
    groupedInputCharacters, treeMapData, root, toolTip, mouseX, mouseY,
    treeMapRects, sankeyRects, sankeyTexts;

function main() {
    inputText = d3.select('#wordbox').node().value;

    toolTip = d3.select('.myContainer')
        .append('div')
        .attr('class', 'toolTip')
        .style('opacity', 0);

    treeMapSvg = d3.select('#treemap_svg');
    treeMapSvg.select('g').remove();

    sankeySvg = d3.select('#sankey_svg');
    sankeySvg.select('g').remove();

    sankeyFlowLabel = d3.select('#flow_label');
    sankeyFlowLabel.html('Character flow for ...');

    preProcessing();
    drawTreeMap();
}

function preProcessing() {
    characterList.forEach(c1 => {
        if (vowelList.includes(c1)) {
            vowelCount[c1] = 0;
        } else if (consonantList.includes(c1)) {
            consonantCount[c1] = 0;
        } else if (punctuationList.includes(c1)) {
            punctuationCount[c1] = 0;
        }
        precedingOccurrences[c1] = {};
        succeedingOccurrences[c1] = {};
        characterList.forEach(c2 => {
            precedingOccurrences[c1][c2] = 0;
            succeedingOccurrences[c1][c2] = 0;
        });
    });

    inputCharacters = inputText.toLowerCase().split('');
    inputCharacters.forEach((c, i) => {
        if (characterList.includes(c)) {
            if (vowelList.includes(c)) {
                vowelCount[c]++;
            } else if (consonantList.includes(c)) {
                consonantCount[c]++;
            } else {
                punctuationCount[c]++;
            }
            if (i > 0) {
                var pc = inputCharacters[i - 1];
                if (characterList.includes(pc)) {
                    precedingOccurrences[c][pc]++;
                }
            }
            if (i < inputCharacters.length - 1) {
                var sc = inputCharacters[i + 1];
                if (characterList.includes(sc)) {
                    succeedingOccurrences[c][sc]++;
                }
            }
        }
    });
}

function drawTreeMap() {
    groupedInputCharacters = {
        'vowels': vowelCount,
        'consonants': consonantCount,
        'punctuations': punctuationCount
    };

    treeMapData = {
        name: 'root',
        children: Object.entries(groupedInputCharacters).map(([group, characters]) => ({
            name: group,
            children: Object.entries(characters).map(([character, count]) => ({ name: character, count }))
        }))
    };

    var treeMapWidth = + treeMapSvg.style('width').replace('px', '');
    var treeMapHeight = + treeMapSvg.style('height').replace('px', '');
    var treeMapInnerWidth = treeMapWidth - (margin['left'] + margin['right']);
    var treeMapInnerHeight = treeMapHeight - (margin['top'] + margin['bottom']);

    treeMapSvg = treeMapSvg
        .attr('width', treeMapWidth)
        .attr('height', treeMapHeight);

    treeMapSvg.select('g').remove();
    var g = treeMapSvg
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`);

    root = d3.hierarchy(treeMapData).sum(d => d.count);

    d3.treemap()
        .size([treeMapInnerWidth, treeMapInnerHeight])
        .paddingInner(3)
        (root);

    treeMapRects = g.selectAll('rect')
        .data(root.leaves())
        .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .style('stroke', 'black')
        .style('stroke-width', 1)
        .style('opacity', 0.75)
        .style('fill', d => color(d.parent.data.name));

    treeMapRects.on('click', (event, d) => {
        drawSankeyChart(d.data.name);
        linkedHighlighting('treeMap', 'mouseover', event, d);
    })
        .on('mouseover', (event, d) => {
            linkedHighlighting('treeMap', 'mouseover', event, d);

            mouseX = event.pageX;
            mouseY = event.pageY;

            toolTip.html('Character: ' + d.data.name + '<br>' + 'Count: ' + d.value)
                .style('left', (mouseX + 20) + 'px')
                .style('top', (mouseY - 130) + 'px')
                .style('opacity', 1)
                .style('font-size', '13px');
        })
        .on('mousemove', (event, d) => {
            mouseX = event.pageX;
            mouseY = event.pageY;
            toolTip.style('left', (mouseX + 20) + 'px')
                .style('top', (mouseY - 130) + 'px')
                .style('opacity', 1);
        })
        .on('mouseout', (event, d) => {
            linkedHighlighting('treeMap', 'mouseout', event, d);

            toolTip.style('opacity', 0);
        });
}

function timeTimes(count) {
    return count == 1 ? count + ' time.' : count + ' times.';
}

function drawSankeyChart(selectedChar) {
    sankeyFlowLabel.html('Character flow for \'' + selectedChar + '\'');

    var nodes = [];
    var i = 0;
    var precedingFlag = false, succeedingFlag = false;
    nodes.push(...characterList.flatMap(char => {
        if (precedingOccurrences[selectedChar][char] !== 0) {
            precedingFlag = true;
            return {
                'node': i++,
                'name': char + '_before'
            };
        }
        return [];
    }));
    nodes.push(...characterList.flatMap(char => {
        if (succeedingOccurrences[selectedChar][char] !== 0) {
            succeedingFlag = true;
            return {
                'node': i++,
                'name': char + '_after'
            };
        }
        return [];
    }));
    nodes.push({
        'node': i++,
        'name': selectedChar
    });

    var links = [];
    var j = i - 1;
    i = 0;
    links = links.concat(characterList.flatMap(char => {
        if (precedingOccurrences[selectedChar][char] !== 0) {
            return {
                'source': i++,
                'target': j,
                'value': precedingOccurrences[selectedChar][char]
            };
        }
        return [];
    }));
    links = links.concat(characterList.flatMap(char => {
        if (succeedingOccurrences[selectedChar][char] !== 0) {
            return {
                'source': j,
                'target': i++,
                'value': succeedingOccurrences[selectedChar][char]
            };
        }
        return [];
    }));

    sankeyData = {
        'nodes': nodes,
        'links': links
    };

    var sankeyWidth = + sankeySvg.style('width').replace('px', '');
    var sankeyHeight = + sankeySvg.style('height').replace('px', '');
    var sankeyInnerWidth = sankeyWidth - (margin['left'] + 15 + margin['right']);
    var sankeyInnerHeight = sankeyHeight - (margin['top'] + margin['bottom']);

    sankeySvg = sankeySvg
        .attr('width', sankeyWidth)
        .attr('height', sankeyHeight);

    sankeySvg.select('g').remove();

    var g = sankeySvg
        .append('g');

    var sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(7.5);

    if (precedingFlag && succeedingFlag) {
        g.attr('transform', `translate(${margin['left'] + 15}, ${margin['top']})`);
        sankey.size([sankeyInnerWidth, sankeyInnerHeight]);
    } else if (precedingFlag) {
        g.attr('transform', `translate(${margin['left'] + 15}, ${margin['top']})`);
        sankey.size([sankeyInnerWidth / 2 + 12.5, sankeyInnerHeight]);
    } else if (succeedingFlag) {
        g.attr('transform', `translate(${margin['left'] + sankeyInnerWidth / 2 + 2.5}, ${margin['top']})`);
        sankey.size([sankeyInnerWidth / 2 + 12.5, sankeyInnerHeight]);
    }

    graph = sankey(sankeyData);

    var links = g.selectAll('.link')
        .data(graph.links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'None')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => d.width)
        .attr('stroke', 'LightGrey');

    var nodes = g.selectAll('.node')
        .data(graph.nodes)
        .enter().append('g')
        .attr('class', 'node');

    nodes.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', sankey.nodeWidth())
        .style('fill', d => {
            char = d.name.charAt(0);
            if (vowelList.includes(char)) return color('vowels');
            if (consonantList.includes(char)) return color('consonants');
            if (punctuationList.includes(char)) return color('punctuations');
        })
        .style('opacity', 0.75)
        .style('stroke', 'black')
        .style('stroke-width', 1)
        .attr('rx', 4)
        .attr('ry', 4);

    sankeyRects = nodes.selectAll('rect');

    nodes.append('text')
        .attr('x', d => d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .text(d => d.name.charAt(0))
        .filter(d => d.x0 < d.width / 2)
        .attr('x', d => d.x1 + 6)
        .attr('text-anchor', 'start');

    sankeyTexts = nodes.selectAll('text');

    nodes.select('rect')
        .on('mouseover', (event, d) => {
            linkedHighlighting('sankey', 'mouseover', event, d);

            mouseX = event.pageX;
            mouseY = event.pageY;

            var toolTipMessage;
            if (d.name.split('_').includes('before')) {
                toolTipMessage = 'Character \'' + d.name.charAt(0) + '\' flows into <br> character \'' + selectedChar +
                    '\' ' + timeTimes(precedingOccurrences[selectedChar][d.name.charAt(0)]);
            } else if (d.name.split('_').includes('after')) {
                toolTipMessage = 'Character \'' + selectedChar + '\' flows into character \'' + d.name.charAt(0)
                    + '\' ' + timeTimes(succeedingOccurrences[selectedChar][d.name.charAt(0)]);
            } else {
                var selectedCharCount;
                for (var leave of root.leaves()) {
                    if (leave.data && leave.data.name === selectedChar) {
                        selectedCharCount = leave.value;
                    }
                }
                toolTipMessage = 'Character \'' + selectedChar + '\' appears ' + timeTimes(selectedCharCount);
            };
            toolTip.html(toolTipMessage)
                .style('left', (mouseX + 20) + 'px')
                .style('top', (mouseY - 130) + 'px')
                .style('opacity', 1)
                .style('font-size', '13px');
        })
        .on('mousemove', (event, d) => {
            mouseX = event.pageX;
            mouseY = event.pageY;
            toolTip.style('left', (mouseX + 20) + 'px')
                .style('top', (mouseY - 130) + 'px')
                .style('opacity', 1);
        })
        .on('mouseout', (event, d) => {
            linkedHighlighting('sankey', 'mouseout', event, d);

            toolTip.style('opacity', 0);
        });
}

function linkedHighlighting(source, action, event, data) {
    if (source == 'treeMap') {
        if (action == 'mouseover') {
            textHighlighting(data.data.name, 'mouseover');
            d3.select(event.currentTarget)
                .transition(1)
                .style('stroke-width', 2.5)
                .style('opacity', 1);

            if (sankeyRects != null) {
                sankeyRects.filter(d => d.name.charAt(0) == data.data.name)
                    .transition(1)
                    .style('stroke-width', 2.25)
                    .style('opacity', 1);

                sankeyTexts.filter(d => d.name.charAt(0) == data.data.name)
                    .transition(1)
                    .attr('font-size', '15px')
                    .attr('font-weight', 'bold');
            }
        } else if (action == 'mouseout') {
            textHighlighting(data.data.name, 'mouseout');
            d3.select(event.currentTarget)
                .transition(1)
                .style('stroke-width', 1)
                .style('opacity', 0.75);

            if (sankeyRects != null) {
                sankeyRects.filter(d => d.name.charAt(0) == data.data.name)
                    .transition(1)
                    .style('stroke-width', 1)
                    .style('opacity', 0.75);

                sankeyTexts.filter(d => d.name.charAt(0) == data.data.name)
                    .transition(1)
                    .attr('font-size', '11px')
                    .attr('font-weight', 'normal');
            }
        }
    } else if (source == 'sankey') {
        if (action == 'mouseover') {
            textHighlighting(data.name.charAt(0), 'mouseover');
            sankeyRects.filter(d => d.name.charAt(0) == data.name.charAt(0))
                .transition(1)
                .style('stroke-width', 2.25)
                .style('opacity', 1);

            sankeyTexts.filter(d => d.name.charAt(0) == data.name.charAt(0))
                .transition(1)
                .attr('font-size', '15px')
                .attr('font-weight', 'bold');

            treeMapRects.filter(d => d.data.name === data.name.charAt(0))
                .transition(1)
                .style('stroke-width', 2.5)
                .style('opacity', 1)
        } else if (action == 'mouseout') {
            textHighlighting(data.name.charAt(0), 'mouseout');
            sankeyRects.filter(d => d.name.charAt(0) == data.name.charAt(0))
                .transition(1)
                .style('stroke-width', 1)
                .style('opacity', 0.75);

            sankeyTexts.filter(d => d.name.charAt(0) == data.name.charAt(0))
                .transition(1)
                .attr('font-size', '11px')
                .attr('font-weight', 'normal');

            treeMapRects.filter(d => d.data.name === data.name.charAt(0))
                .transition(1)
                .style('stroke-width', 1)
                .style('opacity', 0.75)
        }
    }
}

function textHighlighting(char, action) {
    var textarea = document.getElementById('wordbox');
    var highlights = document.getElementById('highlights');
    var backdrop = document.getElementById('backdrop');

    if (action == 'mouseover'){
        handleInput();
        handleScroll();
    } else {
        highlights.innerHTML = '';
    }

    function handleInput() {
        var text = textarea.value;
        var highlightedText = applyHighlights(text, char);
        highlights.innerHTML = highlightedText;
    }

    function applyHighlights(text, highlightCharacter) {
        var escapedHighlightCharacter = highlightCharacter.replace(/[.]/g, '\\$&');

        var regex = new RegExp(escapedHighlightCharacter, 'gi');

        var highlightedText = text.replace(regex, match => '<span>' + match + '</span>');

        highlightedText = highlightedText.replace(/\n$/g, '\n\n');

        return highlightedText;
    }

    function handleScroll() {
        var scrollTop = textarea.scrollTop;
        backdrop.scrollTop = scrollTop;
    }
}