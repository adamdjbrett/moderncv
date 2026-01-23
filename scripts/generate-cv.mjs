import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.join(rootDir, "cv.json");
const texPath = path.join(rootDir, "cv.tex");
const textPath = path.join(rootDir, "cv.text");

const latexEscape = (input = "") =>
	input
		.replace(/\\/g, "\\textbackslash{}")
		.replace(/([&#%_$])/g, "\\$1")
		.replace(/\{/g, "\\{")
		.replace(/\}/g, "\\}")
		.replace(/\^/g, "\\textasciicircum{}")
		.replace(/~/g, "\\textasciitilde{}")
		.replace(/\|/g, "\\textbar{}")
		.replace(/\n/g, " \\\\ ");

const formatDate = (value, fallback = "Present") => {
	if (!value) return fallback;
	const year = new Date(value).getFullYear();
	return Number.isNaN(year) ? fallback : String(year);
};

const readJsonResume = () => {
	const raw = fs.readFileSync(sourcePath, "utf8");
	return JSON.parse(raw);
};

const renderWork = (work = []) =>
	work
		.map((role) => {
			const when = role.startDate || role.endDate
				? `${formatDate(role.startDate, "")}--${formatDate(role.endDate, "Present")}`
				: "Current";
			const employer = role.name || "";
			const location = role.location || "Remote";
			const summary = latexEscape(role.summary || "");
			return `\\cventry{${when}}{${latexEscape(
				role.position || "Role"
			)}}{${latexEscape(employer)}}{${latexEscape(location)}}{}{${summary}}`;
		})
		.join("\n");

const renderEducation = (schools = []) =>
	schools
		.map((school) => {
			const years = `${formatDate(school.startDate, "")}--${formatDate(school.endDate, "Present")}`;
			const degree = `${school.studyType || ""} in ${school.area || ""}`.trim();
			const summary = latexEscape(school.summary || "");
			return `\\cventry{${years}}{${latexEscape(degree)}}{${latexEscape(
				school.institution || ""
			)}}{}{}{${summary}}`;
		})
		.join("\n");

const renderSkills = (skills = []) =>
	skills
		.map((skill) =>
			`\\cvitem{${latexEscape(skill.name)}}{${latexEscape(skill.keywords?.join(", ") || "")}}`
		)
		.join("\n");

const renderListSection = (title, items, formatter) =>
	items && items.length
		? `\\section{${title}}\n${items.map(formatter).join("\n")}`
		: "";

const renderPublications = (publications = []) => {
	if (!publications.length) return "";
	const items = publications
		.map((pub) => {
			const safeUrl = pub.url ? latexEscape(pub.url) : "";
			const linkLine = pub.url ? `\\newline\\href{${safeUrl}}{${safeUrl}}` : "";
			return `\\item ${latexEscape(pub.name || "Untitled")} (${latexEscape(
				pub.publisher || ""
			)}${pub.releaseDate ? ", " + formatDate(pub.releaseDate, "n.d.") : ""}). ${latexEscape(
				pub.summary || ""
			)}${linkLine}`;
		})
		.join("\n");
	return `\\section{Publications}\n\\begin{itemize}\n${items}\n\\end{itemize}`;
};

const buildTex = (data) => {
	const basics = data.basics || {};
	const socialsMap = {
		LinkedIn: "linkedin",
		GitHub: "github",
		ORCID: "orcid",
	};
	const socialCommands = (basics.profiles || [])
		.filter((profile) => socialsMap[profile.network])
		.map(
			(profile) => `\\social[${socialsMap[profile.network]}]{${latexEscape(
				profile.username || profile.url || ""
			)}}`
		)
		.join("\n");

	const summarySection = basics.summary
		? `\\section{Professional Summary}\n\\cvitem{}{${latexEscape(basics.summary)}}`
		: "";

	const volunteerSection = renderListSection(
		"Volunteer",
		data.volunteer || [],
		(entry) =>
			`\\cvitem{${latexEscape(entry.position || "Role")}}{${latexEscape(
				`${entry.organization || ""}${entry.summary ? ": " + entry.summary : ""}`
			)}}`
	);

	const interestsSection = renderListSection(
		"Interests",
		data.interests || [],
		(entry) => `\\cvitem{${latexEscape(entry.name || "")}}{${latexEscape((entry.keywords || []).join(", "))}}`
	);

	const languagesSection = renderListSection(
		"Languages",
		data.languages || [],
		(entry) => `\\cvitemwithcomment{${latexEscape(entry.language)}}{${latexEscape(entry.fluency)}}{}`
	);

	const nameParts = (basics.name || "Adam DJ Brett").trim().split(/\s+/);
	const lastName = nameParts.pop();
	const firstNames = nameParts.join(" ") || "Adam DJ";

	const textBlocks = [
		"% Generated from cv.json via scripts/generate-cv.mjs",
		"\\documentclass[11pt,a4paper,sans]{moderncv}",
		"\\moderncvcolor{blue}",
		"\\moderncvstyle{classic}",
		"\\usepackage[scale=0.75]{geometry}",
		"\\usepackage[english]{babel}",
		`\\name{${latexEscape(firstNames)}}{${latexEscape(lastName || "Brett")}}`,
		basics.label ? `\\title{${latexEscape(basics.label)}}` : "",
		basics.location
			? `\\address{${latexEscape(basics.location.address || "Virtual")}}{${latexEscape(
				`${basics.location.city || ""}, ${basics.location.region || ""} ${basics.location.postalCode || ""}`.trim()
			)}}{${latexEscape(basics.location.countryCode || "")}}`
			: "",
		basics.phone ? `\\phone[mobile]{${latexEscape(basics.phone)}}` : "",
		basics.email ? `\\email{${latexEscape(basics.email)}}` : "",
		basics.url ? `\\homepage{${latexEscape(basics.url)}}` : "",
		socialCommands,
		"\\begin{document}",
		"\\microtypesetup{expansion=false}",
		"\\makecvtitle",
		summarySection,
		"\\section{Experience}",
		renderWork(data.work || []),
		"\\section{Education}",
		renderEducation(data.education || []),
		"\\section{Skills}",
		renderSkills(data.skills || []),
		volunteerSection,
		languagesSection,
		interestsSection,
		renderPublications(data.publications || []),
		"\\end{document}",
	]
		.filter(Boolean)
		.join("\n\n");

	return textBlocks;
};

const buildTextResume = (data) => {
	const lines = [];
	lines.push(data.basics?.name || "Adam DJ Brett");
	if (data.basics?.label) lines.push(data.basics.label);
	const contactBits = [
		data.basics?.location?.address,
		`${data.basics?.location?.city || ""}, ${data.basics?.location?.region || ""}`.trim(),
		data.basics?.phone,
		data.basics?.email,
		data.basics?.url,
	]
		.filter(Boolean)
		.join(" | ");
	if (contactBits) lines.push(contactBits);
	lines.push("");
	if (data.basics?.summary) {
		lines.push("SUMMARY");
		lines.push(data.basics.summary);
		lines.push("");
	}
	if (data.work?.length) {
		lines.push("EXPERIENCE");
		data.work.forEach((role) => {
			lines.push(`${role.position} — ${role.name}`);
			lines.push(role.summary || "");
			lines.push("");
		});
	}
	if (data.education?.length) {
		lines.push("EDUCATION");
		data.education.forEach((school) => {
			lines.push(`${school.studyType} in ${school.area} — ${school.institution}`);
			if (school.summary) lines.push(school.summary);
			lines.push("");
		});
	}
	if (data.skills?.length) {
		lines.push("SKILLS");
		data.skills.forEach((skill) => {
			lines.push(`${skill.name}: ${(skill.keywords || []).join(", ")}`);
		});
		lines.push("");
	}
	if (data.publications?.length) {
		lines.push("PUBLICATIONS");
		data.publications.forEach((pub) => {
			lines.push(`${pub.name} (${pub.publisher || ""})`);
			if (pub.summary) lines.push(pub.summary);
			if (pub.url) lines.push(pub.url);
			lines.push("");
		});
	}
	return lines.join("\n").trim() + "\n";
};

const main = () => {
	const data = readJsonResume();
	const texOutput = buildTex(data);
	const textOutput = buildTextResume(data);
	fs.writeFileSync(texPath, texOutput, "utf8");
	fs.writeFileSync(textPath, textOutput, "utf8");
	console.log(`Generated ${texPath} and ${textPath}`);
};

main();
