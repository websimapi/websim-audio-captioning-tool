// Function to create and manage the caption editor panel
export function createCaptionEditor(captions, updateCallback) {
    const editorContainer = document.createElement('div');
    editorContainer.className = 'caption-panel';
    
    // Function to render all captions in the editor
    function renderCaptionEditors() {
        editorContainer.innerHTML = '';
        
        const listContainer = document.createElement('div');
        listContainer.className = 'caption-list-container';
        
        captions.forEach((caption, index) => {
            const editorElement = createSingleCaptionEditor(caption, index);
            listContainer.appendChild(editorElement);
        });
        
        editorContainer.appendChild(listContainer);
    }
    
    // Function to create a single caption editor
    function createSingleCaptionEditor(caption, index) {
        const editorElement = document.createElement('div');
        editorElement.className = 'caption-editor';
        
        // Format times for display
        const startTime = formatTime(caption.startTime);
        const endTime = formatTime(caption.endTime);
        
        // Caption header with timing information
        const header = document.createElement('h3');
        header.innerHTML = `
            Caption #${index + 1}: <span>${startTime} - ${endTime}</span>
        `;
        editorElement.appendChild(header);
        
        // Text preview section
        const textPreview = document.createElement('div');
        textPreview.className = 'text-preview';
        textPreview.textContent = caption.text;
        editorElement.appendChild(textPreview);
        
        // Add text edit feature
        const textEdit = document.createElement('div');
        textEdit.className = 'text-edit';
        textEdit.innerHTML = `
            <textarea class="caption-text-edit">${caption.text}</textarea>
            <button class="save-text-btn">Save Text</button>
        `;
        editorElement.appendChild(textEdit);
        
        // Save text button listener
        const saveTextBtn = textEdit.querySelector('.save-text-btn');
        saveTextBtn.addEventListener('click', () => {
            const newText = textEdit.querySelector('.caption-text-edit').value;
            caption.text = newText;
            textPreview.textContent = newText;
            
            // Update word timings array if needed
            if (caption.wordTimings) {
                const wordCount = newText.split(' ').length;
                while (caption.wordTimings.length > wordCount) {
                    caption.wordTimings.pop();
                }
                while (caption.wordTimings.length < wordCount) {
                    caption.wordTimings.push({});
                }
            }
            
            if (updateCallback) updateCallback();
            saveTextBtn.textContent = 'Saved!';
            setTimeout(() => { saveTextBtn.textContent = 'Save Text'; }, 1000);
        });
        
        // Create word timing table
        const table = document.createElement('table');
        table.className = 'timing-table';
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Word</th>
                <th>Time</th>
                <th class="edit-cell">Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        const words = caption.text.split(' ');
        
        words.forEach((word, wordIndex) => {
            const tr = document.createElement('tr');
            
            // Word cell
            const wordCell = document.createElement('td');
            wordCell.textContent = word;
            tr.appendChild(wordCell);
            
            // Time cell
            const timeCell = document.createElement('td');
            const timingData = caption.wordTimings && caption.wordTimings[wordIndex];
            const wordTime = timingData && timingData.time !== undefined 
                ? formatTime(timingData.time) 
                : '-- : --';
            
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'timing-display';
            timeDisplay.innerHTML = `<span class="time">${wordTime}</span>`;
            timeCell.appendChild(timeDisplay);
            tr.appendChild(timeCell);
            
            // Actions cell
            const actionsCell = document.createElement('td');
            actionsCell.className = 'edit-cell';
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'timing-button-group';
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                // Switch to edit mode
                timeDisplay.innerHTML = `
                    <input type="text" class="timing-input" value="${wordTime}">
                    <button class="save-timing-btn">Save</button>
                `;
                
                // Set up save button
                const saveBtn = timeDisplay.querySelector('.save-timing-btn');
                saveBtn.addEventListener('click', () => {
                    const newTimeValue = timeDisplay.querySelector('.timing-input').value;
                    const timeComponents = newTimeValue.split(':');
                    let seconds = 0;
                    
                    if (timeComponents.length === 2) {
                        // MM:SS.mmm format
                        seconds = parseInt(timeComponents[0]) * 60 + parseFloat(timeComponents[1]);
                    } else if (timeComponents.length === 3) {
                        // HH:MM:SS.mmm format
                        seconds = parseInt(timeComponents[0]) * 3600 + parseInt(timeComponents[1]) * 60 + parseFloat(timeComponents[2]);
                    }
                    
                    if (!isNaN(seconds)) {
                        // Ensure wordTimings array exists
                        if (!caption.wordTimings) {
                            caption.wordTimings = [];
                        }
                        
                        // Ensure array has enough entries
                        while (caption.wordTimings.length <= wordIndex) {
                            caption.wordTimings.push({});
                        }
                        
                        // Update the time
                        caption.wordTimings[wordIndex].time = seconds;
                        
                        // Update display
                        timeDisplay.innerHTML = `<span class="time">${formatTime(seconds)}</span>`;
                        
                        // Call update callback to refresh other components
                        if (updateCallback) {
                            updateCallback();
                        }
                    }
                });
            });
            buttonGroup.appendChild(editBtn);
            
            // Clear button (if time exists)
            if (timingData && timingData.time !== undefined) {
                const clearBtn = document.createElement('button');
                clearBtn.className = 'action-btn delete-btn';
                clearBtn.textContent = 'Clear';
                clearBtn.addEventListener('click', () => {
                    if (confirm('Remove this word timing?')) {
                        if (caption.wordTimings && caption.wordTimings[wordIndex]) {
                            delete caption.wordTimings[wordIndex].time;
                            
                            // Update display
                            timeDisplay.innerHTML = `<span class="time">-- : --</span>`;
                            
                            // Call update callback
                            if (updateCallback) {
                                updateCallback();
                            }
                        }
                    }
                });
                buttonGroup.appendChild(clearBtn);
            }
            
            actionsCell.appendChild(buttonGroup);
            tr.appendChild(actionsCell);
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        editorElement.appendChild(table);
        
        return editorElement;
    }
    
    // Helper function to format time
    function formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
        
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
    
    // Initial render
    renderCaptionEditors();
    
    // Return methods to manipulate the editor
    return {
        getElement: () => editorContainer,
        refresh: renderCaptionEditors
    };
}