import type {Command} from '../domain/run';
import type {R2RunState} from '../domain/r2Run';

/** The three existing R2_MODE_CATALOG.tutorial steps; no new game actions. */
export type TutorialStepId='select-and-score'|'discard-and-keep'|'buy-and-compare';
export type TutorialCommandType=Extract<Command['action']['type'],'PlayHand'|'DiscardHand'|'BuyOffer'>;
export interface TutorialProgress {
 readonly runId:string;
 readonly status:'active'|'complete'|'unavailable';
 /** 0..2 is the next step; 3 is complete. Never advanced by a view click. */
 readonly stepIndex:0|1|2|3;
 readonly totalSteps:3;
 readonly completedStepIds:readonly TutorialStepId[];
 readonly currentStepId:TutorialStepId|null;
 readonly expectedAction:TutorialCommandType|null;
 /** Current committed phase, for honest instructions before reaching the table/shop. */
 readonly phase:R2RunState['phase'];
 readonly reason:null|'journal-incomplete'|'journal-inconsistent';
}
/** Input must come from SavedRun.state/journal after publication, never exportJSON's pending candidate. */
export type TutorialProgressReader=(state:R2RunState,journal:readonly Command[])=>TutorialProgress|null;
export interface TutorialGuideCallbacks {
 /** Leave teaching through existing normal-selection navigation; preserve every mode's save. */
 readonly onSkip:()=>void;
 /** User-chosen exit after all three real commands; grants no score or unlock. */
 readonly onFinish:()=>void;
}
export interface TutorialGuideView {
 readonly element:HTMLElement;
 /** null hides the surface outside tutorial; unavailable never claims completed steps. */
 update(progress:TutorialProgress|null,options:{readonly actionsEnabled:boolean}):void;
 /** Remove only this view and its listeners, keeping the supplied host intact. */
 destroy():void;
}
export type TutorialGuideViewFactory=(host:HTMLElement,callbacks:TutorialGuideCallbacks)=>TutorialGuideView;
