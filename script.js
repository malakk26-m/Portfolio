/**
 * Represents a single carousel component.
 * Manages image transitions, dot navigation, and infinite looping.
 */
class Carousel {
    constructor(carouselElement) {
        // Store the root element of this specific carousel instance
        this.carouselElement = carouselElement;

        // Select elements within this carousel's scope
        this.allImages = this.carouselElement.querySelectorAll(".carousel-image");
        this.originalImages = this.carouselElement.querySelectorAll(".carousel-image:not(.clone)");
        this.track = this.carouselElement.querySelector(".carousel-track");
        this.dotsContainer = this.carouselElement.querySelector(".carousel-dots");
        this.carouselWindow = this.carouselElement.querySelector(".carousel-window");

        // Configuration for clones and total images
        this.originalTotalImages = this.originalImages.length; // Dynamically gets the count (should be 6)
        this.clonesBefore = 3; // Number of clones added to the beginning of the track
        this.clonesAfter = 3;  // Number of clones added to the end of the track

        this.currentIndex = 0; // The index of the currently displayed original image (0-indexed)

        this.dots = []; // Array to store references to dot elements

        // Bind event handler methods to this instance
        // This ensures 'this' inside the method refers to the Carousel instance, not the event target
        this.handleResize = this.updateCarousel.bind(this);
        this.handleTransitionEnd = this._onTransitionEnd.bind(this);
        this.nextSlide = this._nextSlide.bind(this);
        this.prevSlide = this._prevSlide.bind(this);

        // Initialize the carousel
        this.init();
    }

    /**
     * Initializes the carousel by adding dots, navigation buttons,
     * setting the initial position, and attaching event listeners.
     */
    init() {
        this._addDots();
        this._addNavigation();
        this._initialPositioning(); // Position carousel without transition on load
        window.addEventListener('resize', this.handleResize); // Re-calculate position on window resize
    }

    /**
     * Creates and appends navigation dots to the dots container.
     * Each dot controls direct navigation to its corresponding original image.
     */
    _addDots() {
        if (!this.dotsContainer || this.originalImages.length === 0) {
            console.warn("Dots container or original images not found for a carousel. Skipping dot creation.", this.carouselElement);
            return;
        }

        this.dotsContainer.innerHTML = ''; // Clear any existing dots (important for re-init scenarios if any)
        this.dots = []; // Clear the array of dot references

        this.originalImages.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('carousel-dot');
            if (i === this.currentIndex) {
                dot.classList.add('active'); // Set the initial active dot
            }
            dot.addEventListener('click', () => {
                this.currentIndex = i; // Update current index based on dot clicked
                this.updateCarousel(); // Move to the corresponding slide
            });
            this.dotsContainer.appendChild(dot);
            this.dots.push(dot); // Store the dot element for later access
        });
    }

    /**
     * Creates and appends 'previous' and 'next' navigation buttons.
     */
    _addNavigation() {
        if (!this.carouselWindow) {
            console.warn("Carousel window not found for navigation. Skipping button creation.", this.carouselElement);
            return;
        }

        // Create Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.classList.add('carousel-nav-button', 'prev');
        this.carouselWindow.appendChild(prevButton);
        prevButton.addEventListener('click', this.prevSlide); // Use bound method

        // Create Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        nextButton.classList.add('carousel-nav-button', 'next');
        this.carouselWindow.appendChild(nextButton);
        nextButton.addEventListener('click', this.nextSlide); // Use bound method

        // Listen for transition end to handle infinite loop "teleportation"
        this.track.addEventListener('transitionend', this.handleTransitionEnd);
    }

    /**
     * Calculates the dimensions of a single carousel image and the gap between them.
     * @returns {object} An object containing imageWidth, gap, and itemWidthWithGap.
     */
    _getImageDimensions() {
        if (!this.allImages.length) {
            return { imageWidth: 0, gap: 0, itemWidthWithGap: 0 };
        }
        const firstImage = this.allImages[0];
        const computedStyle = getComputedStyle(firstImage);
        const imageWidth = parseFloat(computedStyle.width);
        const gapStyle = getComputedStyle(this.track).getPropertyValue('gap');
        const gap = parseFloat(gapStyle) || 40; // Default gap if not specified or invalid

        return {
            imageWidth,
            gap,
            itemWidthWithGap: imageWidth + gap
        };
    }

    /**
     * Calculates the translateX offset required to center a specific image in the window.
     * @param {number} effectiveIndex The index of the image in the full track (including clones).
     * @param {number} imageWidth The width of a single image.
     * @param {number} itemWidthWithGap The width of an image plus the gap.
     * @param {number} windowWidth The width of the carousel's visible window.
     * @returns {number} The calculated translateX offset.
     */
    _calculateOffset(effectiveIndex, imageWidth, itemWidthWithGap, windowWidth) {
        // Calculate the center position of the target image
        const targetImageCenterPosition = (effectiveIndex * itemWidthWithGap) + (imageWidth / 2);
        // Calculate the offset needed to bring that center to the center of the window
        return targetImageCenterPosition - (windowWidth / 2);
    }

    /**
     * Updates the carousel's position based on the current index.
     * @param {boolean} instantJump If true, the transition will be disabled for this update.
     */
    updateCarousel(instantJump = false) {
        if (!this.allImages.length || !this.track || !this.carouselWindow) {
            return;
        }

        const { imageWidth, itemWidthWithGap } = this._getImageDimensions();
        const windowWidth = this.carouselWindow.offsetWidth;

        // Calculate the effective index considering the leading clones
        let effectiveIndex = this.currentIndex + this.clonesBefore;
        let offset = this._calculateOffset(effectiveIndex, imageWidth, itemWidthWithGap, windowWidth);

        // Apply transition or disable it based on the instantJump flag
        this.track.style.transition = instantJump ? 'none' : 'transform 0.5s ease-in-out';
        this.track.style.transform = `translateX(-${offset}px)`;

        // Update active class on images for visual highlight
        this.allImages.forEach((img) => {
            img.classList.remove('active');
        });
        if (this.originalImages[this.currentIndex]) {
            this.originalImages[this.currentIndex].classList.add('active');
        }

        // Update active class on dots to reflect current slide
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }

    /**
     * Sets the initial position of the carousel without a transition,
     * ensuring the first original image is displayed correctly on load.
     */
    _initialPositioning() {
        this.track.style.transition = 'none'; // Temporarily disable transition
        this.updateCarousel(true); // Perform the initial positioning
        // Re-enable transition after a very short delay to ensure the browser has rendered the instant jump
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.track.style.transition = 'transform 0.5s ease-in-out';
            });
        });
    }

    /**
     * Navigates to the previous slide. Handles infinite looping from the first slide.
     */
    _prevSlide() {
        if (this.currentIndex === 0) {
            // When going from the first original image backward:
            // 1. Instantly jump to the last original image's clone (just before the first original set)
            this.currentIndex = this.originalTotalImages - 1; // Update current index to the last original
            const { imageWidth, itemWidthWithGap } = this._getImageDimensions();
            const windowWidth = this.carouselWindow.offsetWidth;

            this.track.style.transition = 'none'; // Disable transition for the jump
            // Calculate offset to land on the clone of the last original image
            let tempOffset = this._calculateOffset(this.clonesBefore - 1, imageWidth, itemWidthWithGap, windowWidth);
            this.track.style.transform = `translateX(-${tempOffset}px)`;

            // After the instant jump, re-enable transition and move to the actual last original image
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.updateCarousel(); // This will apply the transition to the desired original image
                });
            });
        } else {
            this.currentIndex--; // Move to the previous original image
            this.updateCarousel();
        }
    }

    /**
     * Navigates to the next slide. Handles infinite looping from the last slide.
     */
    _nextSlide() {
        if (this.currentIndex === this.originalTotalImages - 1) {
            // When going from the last original image forward:
            // 1. Instantly jump to the first original image's clone (just after the last original set)
            this.currentIndex = 0; // Update current index to the first original
            const { imageWidth, itemWidthWithGap } = this._getImageDimensions();
            const windowWidth = this.carouselWindow.offsetWidth;

            this.track.style.transition = 'none'; // Disable transition for the jump
            // Calculate offset to land on the clone of the first original image
            let tempOffset = this._calculateOffset(this.originalTotalImages + this.clonesBefore, imageWidth, itemWidthWithGap, windowWidth);
            this.track.style.transform = `translateX(-${tempOffset}px)`;

            // After the instant jump, re-enable transition and move to the actual first original image
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.updateCarousel(); // This will apply the transition to the desired original image
                });
            });
        } else {
            this.currentIndex++; // Move to the next original image
            this.updateCarousel();
        }
    }

    /**
     * Handler for the transitionend event on the carousel track.
     * Manages the "teleportation" logic for seamless infinite looping when
     * the track reaches the end of its cloned sections.
     */
    _onTransitionEnd() {
        if (!this.allImages.length) return;

        const { imageWidth, itemWidthWithGap } = this._getImageDimensions();
        const windowWidth = this.carouselWindow.offsetWidth;

        // Get the current translateX value of the track
        const currentTransformX = parseFloat(getComputedStyle(this.track).transform.split(',')[4]);

        // Check if we have transitioned to a "before" clone and need to jump back to the end of originals
        // This happens when moving from the first original image backward (currentIndex is 0)
        // and the physical position is effectively past the beginning of the original set.
        if (this.currentIndex === 0 && currentTransformX > -(this.clonesBefore * itemWidthWithGap) ) {
            this.track.style.transition = 'none'; // Disable transition for the jump
            // Calculate offset to land on the actual first original image
            let newOffset = this._calculateOffset(this.clonesBefore, imageWidth, itemWidthWithGap, windowWidth);
            this.track.style.transform = `translateX(-${newOffset}px)`;
            // Re-enable transition after a brief moment
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.track.style.transition = 'transform 0.5s ease-in-out';
                });
            });
        }
        // Check if we have transitioned to an "after" clone and need to jump back to the beginning of originals
        // This happens when moving from the last original image forward (currentIndex is originalTotalImages - 1)
        // and the physical position is effectively past the end of the original set.
        else if (this.currentIndex === this.originalTotalImages - 1 && currentTransformX < -((this.originalTotalImages + this.clonesBefore - 1) * itemWidthWithGap) ) {
             this.track.style.transition = 'none'; // Disable transition for the jump
             // Calculate offset to land on the actual last original image
             let newOffset = this._calculateOffset(this.originalTotalImages + this.clonesBefore - 1, imageWidth, itemWidthWithGap, windowWidth);
             this.track.style.transform = `translateX(-${newOffset}px)`;
             // Re-enable transition after a brief moment
             requestAnimationFrame(() => {
                 requestAnimationFrame(() => {
                     this.track.style.transition = 'transform 0.5s ease-in-out';
                 });
             });
        }
    }
}


// --- Global Initialization for all Carousels on the page ---
// This ensures that when the DOM is fully loaded, all elements with the class "carousel"
// are found, and a new Carousel instance is created for each, making them independent.
document.addEventListener('DOMContentLoaded', () => {
    const allCarouselElements = document.querySelectorAll(".carousel");
    allCarouselElements.forEach(carouselElement => {
        new Carousel(carouselElement); // Initialize a new Carousel object for each instance
    });
});


// --- Global Menu Toggle Functions ---
const navLinks = document.getElementById("navLinks");
const body = document.body; // Get the body element

function showMenu(){
    if (navLinks) {
        navLinks.style.right = "0";
        body.classList.add("menu-open"); // Add this line
    }
}
function hideMenu(){
    if (navLinks) {
        navLinks.style.right = "-100%"; // Changed from -2000px to match CSS more robustly
        body.classList.remove("menu-open"); // Add this line
    }
}
