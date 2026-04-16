function setup() {
    const results = global.results = {};
    results.pi = PI;
    results.two_pi = TWO_PI;
    results.half_pi = HALF_PI;
    results.quarter_pi = QUARTER_PI;
    results.tau = TAU;

    results.degrees = DEGREES;
    results.radians = RADIANS;

    results.abs = abs(-5);
    results.ceil = ceil(4.2);
    results.floor = floor(4.8);
    results.round = round(4.5);
    results.pow = pow(2, 3);
    results.sqrt = sqrt(16);
    results.exp = exp(1);
    results.log = log(Math.E);
    results.max = max(1, 5, 3);
    results.min = min(1, 5, 3);

    results.sq = sq(4);
    results.sq_neg = sq(-3);
    results.mag = mag(3, 4);
    results.mag_neg = mag(-3, -4);
    results.fract = fract(1.5);
    results.fract_int = fract(5);
    results.fract_neg = fract(-1.5);

    results.map = map(50, 0, 100, 0, 1000);
    results.lerp = lerp(0, 100, 0.5);
    results.constrain = constrain(150, 0, 100);
    results.constrain_in_range = constrain(50, 0, 100);
    results.dist = dist(0, 0, 3, 4);
    results.dist_3d = dist(0, 0, 0, 2, 3, 4);

    results.random = random();
    results.random_range = random(10);
    results.random_min_max = random(5, 10);
    results.random_gaussian = randomGaussian();
    results.noise = noise(0.5);
    results.noise_2d = noise(0.5, 0.5);

    results.cos = cos(0);
    results.sin = sin(0);
    results.tan = tan(0);
    results.acos = acos(1);
    results.asin = asin(0);
    results.atan = atan(0);

    results.norm = norm(20, 0, 50);

    results.abs_neg = abs(-1);
    results.ceil_neg = ceil(-1.9);
    results.floor_neg = floor(-1.9);
    results.dist_identical = dist(2, 3, 2, 3);
    results.dist_identical_3d = dist(2, 3, 5, 2, 3, 5);

    results.lerp_start = lerp(0, 5, 0);
    results.lerp_stop = lerp(0, 5, 1);
    results.lerp_avg = lerp(0, 5, 0.5);

    noLoop();
}

function draw() {
    background(0);
}
